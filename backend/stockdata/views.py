# views.py
import os,joblib, base64
import numbers
import numpy as np
import pandas as pd
import json
from django.http import JsonResponse, Http404
import math
from django.core.cache import cache
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from stockdata.models import Company 
from users.models import User
from rest_framework.decorators import api_view, permission_classes,authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from users.authentication import CustomJWTAuthentication
from django.views.decorators.http import require_http_methods

CACHE_TIMEOUT = 3600 
DEBUG = False

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
COMPANIES_FILE = os.path.join(os.path.dirname(__file__), "data", "company_info.json")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "outputs")
DATA_FOLDER = os.path.join(settings.BASE_DIR, 'stockdata', 'data')


def _to_safe_float_series(series):
    """
    Remove commas, coerce to numeric. Returns a pandas Series of floats with NaN for invalid entries.
    """
    return pd.to_numeric(series.astype(str).str.replace(",", "", regex=False), errors="coerce")

def _finite_ohlc_mask(df, cols):
    """
    Return boolean mask where all given cols are finite numbers (not NaN/Inf).
    """
    mask = pd.Series(True, index=df.index)
    for c in cols:
        # ensure numeric dtype first (should already be numeric after _to_safe_float_series)
        mask &= df[c].notna() & np.isfinite(df[c].astype(float))
    return mask

def _py_safe(v):
    # None
    if v is None:
        return None

    # pandas Timestamp
    if isinstance(v, pd.Timestamp):
        return v.strftime("%Y-%m-%d")

    # Detect NA/NaN/NaT
    try:
        if pd.isna(v):
            return None
    except Exception:
        pass

    # Numbers (numpy or python)
    if isinstance(v, numbers.Number):
        try:
            if not np.isfinite(v):
                return None
            # return native python int/float
            if isinstance(v, (np.integer, int)):
                return int(v)
            return float(v)
        except Exception:
            return None

    # Strings/booleans etc.
    if isinstance(v, (str, bool)):
        return v

    # Fallback to str
    try:
        return str(v)
    except Exception:
        return None

def stock_data(request, symbol):
   
    symbol = symbol.upper()
    file_path = os.path.join(DATA_DIR, f"{symbol}.csv")

    if not os.path.exists(file_path):
        raise Http404(f"Data for {symbol} not found")

    # Read CSV
    df = pd.read_csv(file_path)

    for col in ["Open", "High", "Low", "Close", "Volume", "Turnover"]:
        if col in df.columns:
            df[col] = _to_safe_float_series(df[col])
        else:
            df[col] = np.nan

    # Parse Date safely
    if "Date" in df.columns:
        df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    else:
        df["Date"] = pd.NaT

    df = df[df["Date"].notna()].copy()

    ohlc_cols = ["Open", "High", "Low", "Close"]
    df = df[_finite_ohlc_mask(df, ohlc_cols)].copy()

  
    df = df.sort_values("Date").reset_index(drop=True)

    if df.shape[0] == 0:
        raise Http404(f"No valid OHLC rows for {symbol} after cleaning")

    df["SMA20"] = df["Close"].rolling(window=20, min_periods=20).mean()
    df["SMA50"] = df["Close"].rolling(window=50, min_periods=50).mean()
    df["EMA20"] = df["Close"].ewm(span=20, adjust=False).mean()

    df["BB_Mid"] = df["Close"].rolling(window=20, min_periods=20).mean()
    df["BB_Upper"] = df["BB_Mid"] + 2 * df["Close"].rolling(window=20, min_periods=20).std()
    df["BB_Lower"] = df["BB_Mid"] - 2 * df["Close"].rolling(window=20, min_periods=20).std()

    delta = df["Close"].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14, min_periods=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14, min_periods=14).mean()
    rs = gain / loss
    df["RSI14"] = 100 - (100 / (1 + rs))

    exp1 = df["Close"].ewm(span=12, adjust=False).mean()
    exp2 = df["Close"].ewm(span=26, adjust=False).mean()
    df["MACD"] = exp1 - exp2
    df["MACD_Signal"] = df["MACD"].ewm(span=9, adjust=False).mean()

    df["H-L"] = df["High"] - df["Low"]
    df["H-PC"] = (df["High"] - df["Close"].shift(1)).abs()
    df["L-PC"] = (df["Low"] - df["Close"].shift(1)).abs()
    df["TR"] = df[["H-L", "H-PC", "L-PC"]].max(axis=1)
    df["ATR14"] = df["TR"].rolling(window=14, min_periods=14).mean()

    if "Volume" in df.columns:
        df["OBV"] = (df["Volume"] * ((df["Close"] > df["Close"].shift(1)) * 2 - 1)).cumsum()
    else:
        df["OBV"] = np.nan

    # ---------------------------
    # Optional limit param for performance
    # ---------------------------
    limit = request.GET.get("limit")
    if limit:
        try:
            limit = int(limit)
            if limit > 0:
                df_to_return = df.tail(limit).copy()
            else:
                df_to_return = df.copy()
        except ValueError:
            df_to_return = df.copy()
    else:
        df_to_return = df.copy()

    # ---------------------------
    # Convert to JSON-safe records and aligned lists
    # ---------------------------
    # Iterate rows to ensure perfect alignment between dates and numeric arrays
    df_to_return = df_to_return.reset_index(drop=True)  # ensure fresh indexing
    records = df_to_return.to_dict(orient="records")

    # prepare aligned lists
    dates = []
    open_list = []
    high_list = []
    low_list = []
    close_list = []
    volume_list = []
    sma20_list = []
    sma50_list = []
    ema20_list = []
    bb_upper_list = []
    bb_lower_list = []
    rsi14_list = []
    macd_list = []
    macd_signal_list = []
    atr14_list = []
    obv_list = []
    turnover_list = []

    for r in records:
        # Date (Timestamp -> YYYY-MM-DD, else string, else None)
        d = r.get("Date")
        if isinstance(d, pd.Timestamp):
            dates.append(d.strftime("%Y-%m-%d"))
        elif d is None:
            dates.append(None)
        else:
            try:
                dates.append(str(d))
            except Exception:
                dates.append(None)

        open_list.append(_py_safe(r.get("Open")))
        high_list.append(_py_safe(r.get("High")))
        low_list.append(_py_safe(r.get("Low")))
        close_list.append(_py_safe(r.get("Close")))
        volume_list.append(_py_safe(r.get("Volume")))
        turnover_list.append(_py_safe(r.get("Turnover")))
        sma20_list.append(_py_safe(r.get("SMA20")))
        sma50_list.append(_py_safe(r.get("SMA50")))
        ema20_list.append(_py_safe(r.get("EMA20")))
        bb_upper_list.append(_py_safe(r.get("BB_Upper")))
        bb_lower_list.append(_py_safe(r.get("BB_Lower")))
        rsi14_list.append(_py_safe(r.get("RSI14")))
        macd_list.append(_py_safe(r.get("MACD")))
        macd_signal_list.append(_py_safe(r.get("MACD_Signal")))
        atr14_list.append(_py_safe(r.get("ATR14")))
        obv_list.append(_py_safe(r.get("OBV")))
        last_idx = len(dates) - 1
        prev_idx = last_idx - 1 if last_idx >= 1 else None

        latest_open = open_list[last_idx] if last_idx >= 0 else None
        latest_high = high_list[last_idx] if last_idx >= 0 else None
        latest_low = low_list[last_idx] if last_idx >= 0 else None
        latest_close = close_list[last_idx] if last_idx >= 0 else None
        latest_volume = volume_list[last_idx] if last_idx >= 0 else None
        latest_turnover = None
        # if you added turnover_list above:
        if 'turnover_list' in locals() and len(turnover_list) > last_idx:
            latest_turnover = turnover_list[last_idx]

        prev_close = close_list[prev_idx] if prev_idx is not None else None

        # Percentage changes (guard div by zero / None)
        def pct_change(value, base):
            try:
                if value is None or base is None:
                    return None
                if base == 0:
                    return None
                return round(((value - base) / base) * 100, 2)
            except Exception:
                return None

        high_change_pct = pct_change(latest_high, prev_close)
        low_change_pct = pct_change(latest_low, prev_close)

    response = {
        "symbol": symbol,
        "latest": {
            "date": dates[last_idx] if last_idx >= 0 else None,
            "open": latest_open,
            "high": latest_high,
            "low": latest_low,
            "close": latest_close,
            "volume": latest_volume,
            "turnover": latest_turnover,
            "prevClose": prev_close,
            "highChangePct": high_change_pct,
            "lowChangePct": low_change_pct,
        },
        "chart": {
            "dates": dates,
            "open": open_list,
            "high": high_list,
            "low": low_list,
            "close": close_list,
            "volume": volume_list,
            "sma20": sma20_list,
            "sma50": sma50_list,
            "ema20": ema20_list,
            "bb_upper": bb_upper_list,
            "bb_lower": bb_lower_list,
            "rsi14": rsi14_list,
            "macd": macd_list,
            "macd_signal": macd_signal_list,
            "atr14": atr14_list,
            "obv": obv_list,
        },
    }
    if DEBUG:
        # quick sanity check printed to server log
        print("DEBUG: returning chart lengths:", {k: len(v) for k, v in response["chart"].items()})

    return JsonResponse(response, safe=False)


def list_companies(request):
    
    try:
        qs = Company.objects.all().order_by("symbol")
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

    companies = [
        {
            "symbol": c.symbol,
            "full_name": c.full_name,
            "sector": c.sector,
            "logo": c.logo,
        }
        for c in qs
    ]
    return JsonResponse(companies, safe=False)


def price_history(request, symbol):
    file_path = os.path.join(DATA_DIR, f"{symbol.upper()}.csv")
    if not os.path.exists(file_path):
        return JsonResponse({"error": "File not found"}, status=404)

    try:
        df = pd.read_csv(file_path)

        # --- Normalize column names ---
        df.columns = [c.strip().replace(" ", "_").lower() for c in df.columns]

        rename_map = {
            "date": "date",
            "open": "open",
            "high": "high",
            "low": "low",
            "close": "close",
            "percent_change": "change_percent",  # if present in CSV
            "volume": "volume",
            "turnover": "turnover",
        }
        df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

        # --- Parse dates and sort chronologically (oldest -> newest) BEFORE computing diffs ---
        if "date" in df.columns:
            df["date"] = pd.to_datetime(df["date"], errors="coerce")
            df = df.dropna(subset=["date"]).sort_values("date", ascending=True).reset_index(drop=True)

        # --- Clean numeric columns ---
        numeric_cols = ["open", "high", "low", "close", "turnover", "volume"]
        for col in numeric_cols:
            if col in df.columns:
                s = df[col].astype(str).fillna("")
                s = s.str.replace(r"^\s*[-–]\s*$", "", regex=True)   # lone dash -> missing
                s = s.str.replace(",", "", regex=False)              # remove thousand separators
                s = s.str.replace(r"[^0-9.\-]", "", regex=True)      # remove stray chars
                s = s.str.strip()
                df[col] = pd.to_numeric(s, errors="coerce")

        # --- If percent column exists, clean/format it (optional) ---
        if "change_percent" in df.columns:
            s = df["change_percent"].astype(str).fillna("")
            s = s.str.replace("%", "", regex=False).str.strip()
            s = s.str.replace(r"[^0-9.\-]", "", regex=True)
            df["change_percent"] = pd.to_numeric(s, errors="coerce")

        # --- Compute change and percent in chronological order (correct alignment) ---
        if "close" in df.columns:
            df["prev_close"] = df["close"].shift(1)
            # numeric change = current_close - previous_close
            df["change"] = (df["close"] - df["prev_close"]).round(2)
            # percent relative to previous close
            df["change_percent"] = ((df["change"] / df["prev_close"]) * 100).round(2)
            # For the first row (no previous), set to None
            df.loc[df["prev_close"].isna(), ["change", "change_percent"]] = [None, None]
            # Format percent as string like "-5.88%"
            df["change_percent"] = df["change_percent"].apply(
                lambda x: f"{x:.2f}%" if pd.notnull(x) else None
            )
            df = df.drop(columns=["prev_close"], errors="ignore")

        # --- Reverse so latest rows come first (frontend expects latest-first) ---
        df = df.iloc[::-1].reset_index(drop=True)

        # --- Choose and order output columns (keeps original CSV columns if present) ---
        out_cols = []
        if "date" in df.columns:
            df["date"] = df["date"].dt.strftime("%Y-%m-%d")
            out_cols.append("date")

        candidate_cols = ["change", "change_percent", "close", "turnover", "volume", "open", "high", "low"]
        for c in candidate_cols:
            if c in df.columns:
                out_cols.append(c)

        # Ensure JSON-safe (NaN -> None) and convert numpy types to Python primitives
        df_out = df[out_cols].where(pd.notnull(df[out_cols]), None)
        records = df_out.to_dict(orient="records")
        cleaned = []
        for rec in records:
            new_rec = {}
            for k, v in rec.items():
                # numpy scalars -> Python native
                if isinstance(v, (np.integer, np.floating)):
                    v = v.item()
                # floats that are NaN -> None
                if isinstance(v, float) and math.isnan(v):
                    v = None
                new_rec[k] = v
            cleaned.append(new_rec)

        # Return proper JSON (Django JsonResponse sets application/json)
        return JsonResponse(cleaned, safe=False)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

def company_info(request, symbol):
    """
    Return a single company object by symbol, same shape as original JSON file:
    { "symbol": "...", "full_name": "...", "sector": "...", "logo": "media/logos/..." }
    """
    symbol = (symbol or "").strip()
    if not symbol:
        raise Http404("Company not found")

    try:
        company = Company.objects.get(symbol__iexact=symbol)
    except Company.DoesNotExist:
        raise Http404("Company not found")
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

    result = {
        "symbol": company.symbol,
        "full_name": company.full_name,
        "sector": company.sector,
        "logo": company.logo,
    }
    return JsonResponse(result, safe=False)



def nepse_data(request):

    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, 'data', 'nepse', 'nepse.csv')
    if not os.path.exists(csv_path):
        return JsonResponse({"error": "NEPSE CSV file not found"}, status=404)

    df = pd.read_csv(csv_path)

    numeric_cols = ['Open', 'High', 'Low', 'Close', 'Change', 'Per Change (%)', 'Turnover']
    for col in numeric_cols:
        df[col] = df[col].astype(str).str.replace(',', '').astype(float)

    df['Volume (in millions)'] = (df['Turnover'] / 1_000_000).round(2)

    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values('Date', ascending=True)

    data = df.to_dict(orient='records')

    return JsonResponse({'data': data}, safe=False)



def top_gainers_losers(request):
    cached_data = cache.get("top_gainers_losers")
    if cached_data:
        return JsonResponse(cached_data)

    results = []

    for file in os.listdir(DATA_DIR):
        if file.endswith(".csv"):
            path = os.path.join(DATA_DIR, file)
            df = pd.read_csv(path)

            if 'Symbol' not in df.columns or 'Percent Change' not in df.columns:
                continue

            df['Percent Change'] = (
                df['Percent Change']
                .astype(str)
                .str.replace('%', '', regex=False)
                .str.replace(' ', '', regex=False)
            )
            df['Percent Change'] = pd.to_numeric(df['Percent Change'], errors='coerce')
            df = df.dropna(subset=['Percent Change'])
            if df.empty:
                continue

            df = df.sort_values(by='Date', ascending=False)
            if len(df) < 2:
                continue

            latest_row = df.iloc[0]
            previous_row = df.iloc[1]
            actual_change = float(latest_row['Close']) - float(previous_row['Close'])

            results.append({
                'symbol': latest_row['Symbol'],
                'percent_change': float(latest_row['Percent Change']),
                'close': float(latest_row['Close']),
                'change': actual_change
            })

    top_gainers = sorted(results, key=lambda x: x['percent_change'], reverse=True)[:5]
    top_losers = sorted(results, key=lambda x: x['percent_change'])[:5]

    data = {'top_gainers': top_gainers, 'top_losers': top_losers}
    cache.set("top_gainers_losers", data, CACHE_TIMEOUT)  # Save to cache
    return JsonResponse(data)


def announcement(request, symbol):
    try:
        base_dir = os.path.dirname(__file__)              
        file_path = os.path.join(base_dir, "data", "announcement", f"{symbol.upper()}.csv")

        if not os.path.exists(file_path):
            return JsonResponse({"error": f"No announcement file found for {symbol}"}, status=404)

        # Read CSV file
        df = pd.read_csv(file_path)

        # Drop sentiment column if present
        if "sentiment" in df.columns:
            df = df.drop(columns=["sentiment"])

        # Convert DataFrame to JSON
        data = df.to_dict(orient="records")

        return JsonResponse(data, safe=False, status=200)
    
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


def stock_prediction(request, symbol):
    symbol_upper = symbol.upper()
    json_path = os.path.join(OUTPUT_DIR, symbol_upper, f"{symbol_upper}_results.json")
    csv_path = os.path.join(OUTPUT_DIR, symbol_upper, f"{symbol_upper}_results.csv")

    if not os.path.exists(json_path) or not os.path.exists(csv_path):
        raise Http404("Prediction data not found.")

    with open(json_path, 'r') as f:
        data = json.load(f)

    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        raise Http404(f"Error reading CSV: {e}")

    predictions = []
    for _, row in df.iterrows():
        predictions.append({
            "date": row.get("Date"),
            "actual_close": row.get("Actual_Close"),
            "pred_close": row.get("Predicted_Close"),
            "actual_label": row.get("Actual_Direction"),
            "pred_label": row.get("Predicted_Direction")
        })

    response_data = {
        "symbol": data.get("symbol"),
        "next_day_prediction": {
            "last_date": data["next_prediction"].get("last_date"),
            "last_close": data["next_prediction"].get("last_close"),
            "predicted_date": data["next_prediction"].get("predicted_date"),
            "pred_price": data["next_prediction"].get("predicted_close"),
            "change_amount": data["next_prediction"].get("change_amount"),
            "change_pct": data["next_prediction"].get("change_pct"),
            "pred_movement": data["next_prediction"].get("direction")
        },
        "classification_metrics": data.get("classification"),
        "predictions": predictions
    }

    return JsonResponse(response_data, safe=False)


@api_view(['POST'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def upload_stock_files(request):
    user = request.user
    if not getattr(user, 'is_admin', False):
        return JsonResponse({"success": False, "message": "Forbidden - admin only"}, status=403)

    if not request.FILES:
        return JsonResponse({"success": False, "message": "No files uploaded"}, status=400)

    try:
        os.makedirs(DATA_FOLDER, exist_ok=True)
        for key in request.FILES:
            file = request.FILES[key]
            safe_name = os.path.basename(file.name)
            path = os.path.join(DATA_FOLDER, safe_name)
            with open(path, "wb+") as f:
                for chunk in file.chunks():
                    f.write(chunk)
    except Exception as exc:
        return JsonResponse({"success": False, "message": f"File save error: {str(exc)}"}, status=500)

    return JsonResponse({"success": True, "message": "Files uploaded successfully"}, status=200)



# --- LIST ALL COMPANIES ---
@require_http_methods(["GET"])
def list_companies_admin(request):
    companies = Company.objects.all().values(
        "id", "symbol", "full_name", "sector", "logo", "metadata"
    )
    return JsonResponse(list(companies), safe=False)


# --- CREATE NEW COMPANY ---
@csrf_exempt
@require_http_methods(["POST"])
def create_company(request):
    try:
        data = json.loads(request.body)
        company = Company.objects.create(
            symbol=data["symbol"],
            full_name=data.get("full_name", ""),
            sector=data.get("sector", ""),
            logo=data.get("logo", ""),
            metadata=data.get("metadata", {}),
        )
        return JsonResponse({"status": "success", "id": company.id})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)


# --- UPDATE COMPANY ---
@csrf_exempt
@require_http_methods(["PUT"])
def update_company(request, company_id):
    try:
        data = json.loads(request.body)
        company = Company.objects.get(id=company_id)
        company.symbol = data.get("symbol", company.symbol)
        company.full_name = data.get("full_name", company.full_name)
        company.sector = data.get("sector", company.sector)
        company.logo = data.get("logo", company.logo)
        company.metadata = data.get("metadata", company.metadata)
        company.save()
        return JsonResponse({"status": "success"})
    except Company.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Company not found"}, status=404)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)


# --- DELETE COMPANY ---
@csrf_exempt
@require_http_methods(["DELETE"])
def delete_company(request, company_id):
    try:
        company = Company.objects.get(id=company_id)
        company.delete()
        return JsonResponse({"status": "success"})
    except Company.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Company not found"}, status=404)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)