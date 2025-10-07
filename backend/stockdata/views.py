# views.py
import os
import numbers
import numpy as np
import pandas as pd
import json
from django.http import JsonResponse, Http404
import math


# toggle for server-side debug prints
DEBUG = False

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

COMPANIES_FILE = os.path.join(os.path.dirname(__file__), "data", "company_info.json")

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
    """
    Convert a pandas/numpy value to JSON-safe Python primitive:
      - pd.Timestamp -> 'YYYY-MM-DD'
      - NaN/NaT/Inf -> None
      - numpy/pandas numeric types -> native float/int
      - other -> str(...) or None if conversion fails
    """
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
    """
    GET /api/<SYMBOL>/?limit=NN
    Returns:
      {
        symbol: "SYMBOL",
        latest: { date, close, volume },
        chart: { dates: [...], open: [...], high: [...], low: [...], close: [...], volume: [...], sma20: [...], ... }
      }
    """
    symbol = symbol.upper()
    file_path = os.path.join(DATA_DIR, f"{symbol}.csv")

    if not os.path.exists(file_path):
        raise Http404(f"Data for {symbol} not found")

    # Read CSV
    df = pd.read_csv(file_path)

    # ---------------------------
    # Safe numeric conversion
    # ---------------------------
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

    # Drop rows with invalid dates (can't plot without a date)
    df = df[df["Date"].notna()].copy()

    # Drop rows where OHLC are not finite numbers (required for valid candlesticks)
    ohlc_cols = ["Open", "High", "Low", "Close"]
    df = df[_finite_ohlc_mask(df, ohlc_cols)].copy()

    # Sort ascending by Date (oldest -> newest)
    df = df.sort_values("Date").reset_index(drop=True)

    if df.shape[0] == 0:
        raise Http404(f"No valid OHLC rows for {symbol} after cleaning")

    # ---------------------------
    # Compute indicators on cleaned dataframe
    # ---------------------------
    # Use min_periods so early rows where indicator can't be computed remain NaN (we convert to None later)
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
        with open(COMPANIES_FILE, "r", encoding="utf-8") as f:
            company_info = json.load(f)
    except Exception as e:
        print("Error loading company_info.json:", e)
        company_info = []

    # Sort alphabetically by symbol
    company_info = sorted(company_info, key=lambda x: x["symbol"])
    return JsonResponse(company_info, safe=False)


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

    try:
        with open(COMPANIES_FILE, "r", encoding="utf-8") as f:
            companies = json.load(f)

        # Find the company by symbol (case-insensitive)
        company = next(
            (c for c in companies if c["symbol"].lower() == symbol.lower()), None
        )

        if not company:
            raise Http404("Company not found")

        return JsonResponse(company, safe=False)

    except FileNotFoundError:
        return JsonResponse({"error": "Company info file not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)