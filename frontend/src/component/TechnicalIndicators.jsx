// TechnicalIndicators.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

/*
  TechnicalIndicators.jsx
  - Info Card always visible (shows latest by default)
  - Hover updates Info Card, mouse leave reverts to latest
  - Pin button to lock Info Card to a specific index
  - Clear badges for RSI / MACD / Trend / Recommendation
  - All computation client-side as before
*/

export default function TechnicalIndicators() {
    const { symbol } = useParams();
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [data, setData] = useState(null);
    const [latest, setLatest] = useState(null);

    // indicator toggles & periods
    const [showSMA20, setShowSMA20] = useState(true);
    const [showSMA50, setShowSMA50] = useState(true);
    const [showEMA20, setShowEMA20] = useState(false);
    const [showBB, setShowBB] = useState(false);
    const [showMACD, setShowMACD] = useState(false);
    const [showRSI, setShowRSI] = useState(false);
    const [showVolume, setShowVolume] = useState(true);
    const [smaPeriodShort, setSmaPeriodShort] = useState(20);
    const [smaPeriodLong, setSmaPeriodLong] = useState(50);

    // editable inputs (strings)
    const [smaShortInput, setSmaShortInput] = useState(String(smaPeriodShort));
    const [smaLongInput, setSmaLongInput] = useState(String(smaPeriodLong));
    useEffect(() => { setSmaShortInput(String(smaPeriodShort)); }, [smaPeriodShort]);
    useEffect(() => { setSmaLongInput(String(smaPeriodLong)); }, [smaPeriodLong]);

    // view & interaction refs/state
    const [presetView, setPresetView] = useState("120");
    const viewRef = useRef({ startIndex: 0, endIndex: 0, isDragging: false, dragStartX: 0, dragStartStartIndex: 0 });
    const hoverIndexRef = useRef(null);
    const [hoverIndex, setHoverIndex] = useState(null);

    // Pin the info card (null = not pinned; otherwise index number)
    const [pinnedIndex, setPinnedIndex] = useState(null);

    // ---------- helpers (same as before) ----------
    const toNum = (v) => {
        if (v === null || v === undefined) return null;
        if (typeof v === "number") return Number.isFinite(v) ? v : null;
        const n = Number(String(v).replace(/,/g, ""));
        return Number.isFinite(n) ? n : null;
    };

    const alignSeries = (src) => {
        const dates = Array.isArray(src.dates) ? src.dates.slice() : [];
        const len = dates.length;
        const ensure = (k) => {
            if (!Array.isArray(src[k])) return Array(len).fill(null);
            return src[k].slice(0, len).concat(Array(Math.max(0, len - src[k].length)).fill(null));
        };
        const mapNum = (arr) => arr.map(toNum);
        return {
            dates,
            open: mapNum(ensure("open")),
            high: mapNum(ensure("high")),
            low: mapNum(ensure("low")),
            close: mapNum(ensure("close")),
            volume: mapNum(ensure("volume")),
        };
    };

    const sma = (arr, p) => {
        const out = Array(arr.length).fill(null);
        if (p <= 0) return out;
        let sum = 0, count = 0;
        for (let i = 0; i < arr.length; i++) {
            const v = arr[i];
            if (v !== null && !isNaN(v)) { sum += v; count++; }
            if (i >= p && arr[i - p] !== null && !isNaN(arr[i - p])) { sum -= arr[i - p]; count--; }
            if (i >= p - 1 && count > 0) out[i] = sum / p;
        }
        return out;
    };

    const ema = (arr, p) => {
        const out = Array(arr.length).fill(null);
        if (p <= 0) return out;
        const k = 2 / (p + 1);
        let prev = null;
        for (let i = 0; i < arr.length; i++) {
            const v = arr[i];
            if (prev === null && v !== null && !isNaN(v)) { prev = v; out[i] = v; continue; }
            if (prev !== null) {
                if (v === null || isNaN(v)) out[i] = prev;
                else { prev = prev + k * (v - prev); out[i] = prev; }
            }
        }
        return out;
    };

    const rsi = (arr, period = 14) => {
        const out = Array(arr.length).fill(null);
        if (period <= 0) return out;
        const changes = [];
        for (let i = 1; i < arr.length; i++) {
            const a = arr[i - 1], b = arr[i];
            if (a === null || b === null) { changes.push(null); continue; }
            changes.push(b - a);
        }
        let avgG = 0, avgL = 0, count = 0;
        for (let i = 0; i < changes.length; i++) {
            const ch = changes[i];
            if (ch === null) continue;
            const g = Math.max(0, ch), l = Math.max(0, -ch);
            if (i < period) { avgG += g; avgL += l; count++; if (i === period - 1 && count === period) { avgG /= period; avgL /= period; out[i + 1] = 100 - 100 / (1 + (avgL === 0 ? Infinity : avgG / avgL)); } }
            else if (i >= period && !isNaN(avgG)) { avgG = (avgG * (period - 1) + g) / period; avgL = (avgL * (period - 1) + l) / period; out[i + 1] = 100 - 100 / (1 + (avgL === 0 ? Infinity : avgG / avgL)); }
        }
        return out;
    };

    const macd = (arr, fast = 12, slow = 26, signal = 9) => {
        const fastE = ema(arr, fast);
        const slowE = ema(arr, slow);
        const macdLine = Array(arr.length).fill(null);
        for (let i = 0; i < arr.length; i++) {
            const a = fastE[i], b = slowE[i];
            macdLine[i] = a !== null && b !== null ? a - b : null;
        }
        const signalLine = ema(macdLine, signal);
        const hist = macdLine.map((v, i) => (v !== null && signalLine[i] !== null ? v - signalLine[i] : null));
        return { macdLine, signalLine, hist };
    };

    const bollinger = (arr, p = 20, k = 2) => {
        const mid = sma(arr, p); const upper = Array(arr.length).fill(null); const lower = Array(arr.length).fill(null);
        for (let i = p - 1; i < arr.length; i++) {
            const slice = arr.slice(i - p + 1, i + 1).filter((v) => v !== null && !isNaN(v));
            if (slice.length < p) continue;
            const mean = mid[i];
            const variance = slice.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / p;
            const sd = Math.sqrt(variance);
            upper[i] = mean + k * sd; lower[i] = mean - k * sd;
        }
        return { upper, mid, lower };
    };


    // ----- fetch & compute indicators -----
    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            try {
                const url = `http://127.0.0.1:8000/api/${symbol}/`;
                const res = await axios.get(url);
                if (cancelled) return;
                if (!res.data || !res.data.chart) return;
                const aligned = alignSeries(res.data.chart);
                const close = aligned.close;
                const smaShort = sma(close, smaPeriodShort);
                const smaLong = sma(close, smaPeriodLong);
                const emaShort = ema(close, smaPeriodShort);
                const rsi14 = rsi(close, 14);
                const macdObj = macd(close);
                const bb = bollinger(close, 20, 2);
                const computed = {
                    ...aligned,
                    smaShort, smaLong, emaShort, rsi14,
                    macd: macdObj.macdLine, macdSignal: macdObj.signalLine, macdHist: macdObj.hist,
                    bb_upper: bb.upper, bb_mid: bb.mid, bb_lower: bb.lower,
                };
                setData(computed);
                if (res.data.latest) setLatest(res.data.latest);

                // initialize view according to presetView
                const total = aligned.dates.length;
                let initial = presetView === "all" ? total : Math.min(total, Number(presetView || 120));
                viewRef.current.startIndex = Math.max(0, total - initial);
                viewRef.current.endIndex = total;
            } catch (err) {
                console.error(err);
            }
        };
        run();
        return () => { cancelled = true; };
    }, [symbol, smaPeriodShort, smaPeriodLong, presetView]);

    // ---------- SIGNAL EVALUATION HELPERS ----------
    const rsiLabel = (r) => {
        if (r === null || r === undefined) return { label: "N/A", score: 0 };
        if (r > 70) return { label: "Overbought", score: -1, color: "#c62828" };
        if (r < 30) return { label: "Oversold", score: +1, color: "#007f33" };
        return { label: "Neutral", score: 0, color: "#9e9e9e" };
    };

    const macdLabel = (macdV, macdSignalV, macdHistV) => {
        if (macdV === null || macdSignalV === null || macdHistV === null) return { label: "N/A", score: 0, color: "#bdbdbd" };
        if (macdV > macdSignalV && macdHistV > 0) return { label: "Bullish", score: +1, color: "#007f33" };
        if (macdV < macdSignalV && macdHistV < 0) return { label: "Bearish", score: -1, color: "#c62828" };
        return { label: "Neutral", score: 0, color: "#9e9e9e" };
    };

    const trendLabel = (price, smaS, smaL) => {
        if (price === null || smaS === null || smaL === null) return { label: "N/A", score: 0, color: "#bdbdbd" };
        if (price > smaS && smaS > smaL) return { label: "Bullish", score: +1, color: "#007f33" };
        if (price < smaS && smaS < smaL) return { label: "Bearish", score: -1, color: "#c62828" };
        return { label: "Neutral", score: 0, color: "#9e9e9e" };
    };

    const evaluateSignals = (idx) => {
        if (!data) return null;
        if (idx === null) idx = data.dates.length - 1; // latest if null
        if (idx < 0 || idx >= data.dates.length) return null;

        const price = data.close[idx];
        const smaS = data.smaShort ? data.smaShort[idx] : null;
        const smaL = data.smaLong ? data.smaLong[idx] : null;
        const rsiV = data.rsi14 ? data.rsi14[idx] : null;
        const macdV = data.macd ? data.macd[idx] : null;
        const macdSignalV = data.macdSignal ? data.macdSignal[idx] : null;
        const macdHistV = data.macdHist ? data.macdHist[idx] : null;

        const r = rsiLabel(rsiV);
        const m = macdLabel(macdV, macdSignalV, macdHistV);
        const t = trendLabel(price, smaS, smaL);

        // score aggregation: trend + macd + rsi(oversold +1 / overbought -1)
        const score = (t.score || 0) + (m.score || 0) + (r.score || 0);

        let recommendation = "Hold";
        if (score >= 2) recommendation = "Strong Buy";
        else if (score === 1) recommendation = "Buy";
        else if (score === 0) recommendation = "Hold";
        else if (score === -1) recommendation = "Sell";
        else if (score <= -2) recommendation = "Strong Sell";

        return {
            index: idx,
            price, smaS, smaL, rsiV, macdV, macdSignalV, macdHistV,
            rsi: r, macd: m, trend: t, score, recommendation
        };
    };

    // ---------- drawing (same as before, omitted for brevity in this comment) ----------
    // (We keep your existing draw implementation — it uses hoverIndexRef for crosshair rendering.)
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data) return;
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        const width = rect.width, height = rect.height;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);

        // layout
        const padding = { top: 28, right: 110, left: 50, bottom: 24 };
        const paneGap = 10;
        const priceH = Math.floor(height * 0.5);
        const macdPaneH = showMACD ? Math.floor(height * 0.13) : 0;
        const rsiPaneH = showRSI ? Math.floor(height * 0.12) : 0;
        const volumePaneH = showVolume ? Math.floor(height * 0.12) : 0;

        // clamp indices
        const total = data.dates.length;
        let s = Math.max(0, Math.min(viewRef.current.startIndex, total - 1));
        let e = Math.max(s + 1, Math.min(viewRef.current.endIndex, total));
        const minLen = Math.min(data.dates.length, data.open.length, data.close.length, data.volume.length);
        s = Math.max(0, Math.min(s, minLen - 1)); e = Math.max(s + 1, Math.min(e, minLen));
        viewRef.current.startIndex = s; viewRef.current.endIndex = e;

        // visible slices
        const vis = {
            dates: data.dates.slice(s, e),
            open: data.open.slice(s, e),
            high: data.high.slice(s, e),
            low: data.low.slice(s, e),
            close: data.close.slice(s, e),
            volume: data.volume.slice(s, e),
            smaShort: (data.smaShort || []).slice(s, e),
            smaLong: (data.smaLong || []).slice(s, e),
            emaShort: (data.emaShort || []).slice(s, e),
            bb_upper: (data.bb_upper || []).slice(s, e),
            bb_mid: (data.bb_mid || []).slice(s, e),
            bb_lower: (data.bb_lower || []).slice(s, e),
            macd: (data.macd || []).slice(s, e),
            macdSignal: (data.macdSignal || []).slice(s, e),
            macdHist: (data.macdHist || []).slice(s, e),
            rsi14: (data.rsi14 || []).slice(s, e),
        };

        const n = vis.dates.length; if (n <= 0) return;

        // drawing helpers
        const chartLeft = padding.left; const chartRight = width - padding.right; const chartWidth = chartRight - chartLeft;
        const candleSpacing = chartWidth / n; const candleW = Math.max(2, candleSpacing * 0.7);

        const highs = vis.high.filter(v => v !== null); const lows = vis.low.filter(v => v !== null);
        const maxPrice = Math.max(...highs); const minPrice = Math.min(...lows); const priceRange = (maxPrice - minPrice) || 1;
        const pricePad = priceRange * 0.05;
        const priceTop = padding.top; const priceHTotal = priceH;
        const priceToY = (p) => priceTop + priceHTotal * (1 - (p - minPrice + pricePad) / (priceRange + pricePad * 2));

        // grid
        ctx.strokeStyle = "#e9edf5"; ctx.fillStyle = "#333"; ctx.font = "12px Arial"; ctx.textAlign = "right";
        const gridLines = 6;
        for (let i = 0; i <= gridLines; i++) {
            const y = priceTop + (priceHTotal / gridLines) * i;
            ctx.beginPath(); ctx.moveTo(chartLeft, y); ctx.lineTo(chartRight, y); ctx.stroke();
            const price = maxPrice - (priceRange / gridLines) * i;
            ctx.fillText(price.toFixed(2), chartLeft - 8, y + 4);
        }

        // Bollinger
        if (showBB) {
            ctx.beginPath(); let started = false;
            for (let i = 0; i < n; i++) {
                const u = vis.bb_upper[i], l = vis.bb_lower[i];
                if (u === null || l === null) continue;
                const x = chartLeft + candleSpacing * i + candleSpacing / 2;
                const yu = priceToY(u);
                if (!started) { ctx.moveTo(x, yu); started = true; } else ctx.lineTo(x, yu);
            }
            if (started) {
                for (let i = n - 1; i >= 0; i--) {
                    const u = vis.bb_upper[i], l = vis.bb_lower[i];
                    if (u === null || l === null) continue;
                    const x = chartLeft + candleSpacing * i + candleSpacing / 2;
                    const yl = priceToY(l);
                    ctx.lineTo(x, yl);
                }
                ctx.closePath(); ctx.fillStyle = "rgba(66,133,244,0.08)"; ctx.fill(); ctx.strokeStyle = "rgba(66,133,244,0.25)"; ctx.stroke();
            }
        }

        // moving averages
        const drawLine = (arr, color, width = 1.2) => {
            ctx.beginPath(); let started = false;
            for (let i = 0; i < n; i++) {
                const v = arr[i]; if (v === null) continue;
                const x = chartLeft + candleSpacing * i + candleSpacing / 2; const y = priceToY(v);
                if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
            }
            if (started) { ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke(); }
        };
        if (showSMA20) drawLine(vis.smaShort, "#ff8a65", 1.6);
        if (showSMA50) drawLine(vis.smaLong, "#9fa8da", 1.6);
        if (showEMA20) drawLine(vis.emaShort, "#4db6ac", 1.4);

        // candles
        for (let i = 0; i < n; i++) {
            const o = vis.open[i], h = vis.high[i], l = vis.low[i], c = vis.close[i];
            if ([o, h, l, c].some(x => x === null)) continue;
            const cx = chartLeft + candleSpacing * i + candleSpacing / 2;
            const yH = priceToY(h), yL = priceToY(l);
            ctx.strokeStyle = c >= o ? "#089981" : "#F23645"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(cx, yH); ctx.lineTo(cx, yL); ctx.stroke();
            const yTop = priceToY(Math.max(o, c)); const yBot = priceToY(Math.min(o, c)); const bh = Math.max(1, yBot - yTop);
            ctx.fillStyle = c >= o ? "#089981" : "#F23645";
            ctx.fillRect(cx - candleW / 2, yTop, candleW, bh);
        }

        // panes stacked: MACD, RSI, Volume
        let offsetY = priceTop + priceHTotal + paneGap;
        if (showMACD) {
            const macdTop = offsetY; const macdHLocal = macdPaneH || Math.floor(height * 0.13);
            const macdVals = (vis.macd || []).concat(vis.macdSignal || []).filter(v => v !== null);
            const macdMax = macdVals.length ? Math.max(...macdVals) : 1; const macdMin = macdVals.length ? Math.min(...macdVals) : -1; const macdRange = macdMax - macdMin || 1;
            const macdToY = (v) => macdTop + macdHLocal * (1 - (v - macdMin) / macdRange);
            // histogram
            for (let i = 0; i < n; i++) {
                const h = vis.macdHist[i];
                if (h === null) continue;
                const x = chartLeft + candleSpacing * i;
                const y0 = macdToY(0); const y = macdToY(h);
                ctx.fillStyle = h >= 0 ? "rgba(76,175,80,0.6)" : "rgba(244,67,54,0.6)";
                ctx.fillRect(x, Math.min(y0, y), Math.max(1, candleW), Math.abs(y0 - y));
            }

            // lines
            ctx.lineWidth = 1.2; ctx.strokeStyle = "#3f51b5"; ctx.beginPath(); let startedML = false;
            for (let i = 0; i < n; i++) { const v = vis.macd[i]; if (v === null) continue; const x = chartLeft + candleSpacing * i + candleSpacing / 2; const y = macdToY(v); if (!startedML) { ctx.moveTo(x, y); startedML = true; } else ctx.lineTo(x, y); } ctx.stroke();
            ctx.strokeStyle = "#ff5722"; ctx.beginPath(); let startedSL = false;
            for (let i = 0; i < n; i++) { const v = vis.macdSignal[i]; if (v === null) continue; const x = chartLeft + candleSpacing * i + candleSpacing / 2; const y = macdToY(v); if (!startedSL) { ctx.moveTo(x, y); startedSL = true; } else ctx.lineTo(x, y); } ctx.stroke();
            offsetY += macdHLocal + paneGap;
        }
        if (showRSI) {
            const rsiTop = offsetY;
            const rsiHLocal = rsiPaneH || Math.floor(height * 0.12);
            const rsiToY = (v) => rsiTop + rsiHLocal * (1 - v / 100);

            // draw horizontal levels and labels
            const levels = [70, 50, 30];
            ctx.lineWidth = 1;
            ctx.font = "11px Arial";
            ctx.textAlign = "right";

            levels.forEach((lvl) => {
                const y = rsiToY(lvl);
                // line
                ctx.beginPath();
                ctx.strokeStyle = "#e9edf5";
                ctx.moveTo(chartLeft, y);
                ctx.lineTo(chartRight, y);
                ctx.stroke();

                // colored label at left (just outside the chart area)
                let lblColor = "#9e9e9e";
                if (lvl === 70) lblColor = "#c62828"; // overbought
                if (lvl === 30) lblColor = "#007f33"; // oversold
                ctx.fillStyle = lblColor;
                ctx.fillText(String(lvl), chartLeft - 8, y + 4);
            });


            // draw RSI line (unchanged)
            ctx.beginPath(); let startedR = false;
            for (let i = 0; i < n; i++) {
                const v = vis.rsi14[i];
                if (v === null) continue;
                const x = chartLeft + candleSpacing * i + candleSpacing / 2;
                const y = rsiToY(v);
                if (!startedR) { ctx.moveTo(x, y); startedR = true; } else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = "#9c27b0";
            ctx.lineWidth = 1.2;
            ctx.stroke();

            offsetY += rsiHLocal + paneGap;
        }


        if (showVolume) {
            const volTop = offsetY; const volHLocal = volumePaneH || Math.floor(height * 0.12);
            const maxVol = vis.volume.filter(v => v !== null).length ? Math.max(...vis.volume.filter(v => v !== null)) : 1;
            for (let i = 0; i < n; i++) {
                const v = vis.volume[i]; if (v === null) continue;
                const o = vis.open[i], c = vis.close[i]; const x = chartLeft + candleSpacing * i; const h = Math.round((v / maxVol) * volHLocal);
                ctx.fillStyle = c !== null && o !== null && c >= o ? "rgba(38,166,154,0.7)" : "rgba(239,83,80,0.7)";
                ctx.fillRect(x, volTop + volHLocal - h, Math.max(1, candleW), h);
            }
        }

        // crosshair if hoverIndex present
        const currentHover = hoverIndexRef.current;
        if (currentHover !== null) {
            const localIdx = currentHover - s;
            if (localIdx >= 0 && localIdx < n) {
                const x = chartLeft + candleSpacing * localIdx + candleSpacing / 2;
                ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.moveTo(x, padding.top); ctx.lineTo(x, height - padding.bottom); ctx.stroke();
            }
        }

        // legend
        const legendX = width - padding.right + 8; let ly = padding.top;
        const legendRow = (color, label) => { ctx.fillStyle = color; ctx.fillRect(legendX, ly, 12, 8); ctx.fillStyle = "#222"; ctx.font = "12px Arial"; ctx.textAlign = "left"; ctx.fillText(" " + label, legendX + 18, ly + 8); ly += 18; };
        if (showSMA20) legendRow("#ff8a65", `SMA ${smaPeriodShort}`); if (showSMA50) legendRow("#9fa8da", `SMA ${smaPeriodLong}`); if (showEMA20) legendRow("#4db6ac", `EMA ${smaPeriodShort}`); if (showBB) legendRow("rgba(66,133,244,0.9)", "Bollinger Bands"); if (showMACD) legendRow("#3f51b5", "MACD Line"); if (showRSI) legendRow("#9c27b0", "RSI (14)"); if (showVolume) legendRow("rgba(38,166,154,0.7)", "Volume Up / Down");

    }, [data, showSMA20, showSMA50, showEMA20, showBB, showMACD, showRSI, showVolume, smaPeriodShort, smaPeriodLong]);

    // ----- DPR / resize -----
    useEffect(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const resize = () => {
            const dpr = Math.max(1, window.devicePixelRatio || 1);
            canvas.style.width = "100%"; canvas.style.height = "640px";
            const rect = canvas.getBoundingClientRect();
            canvas.width = Math.floor(rect.width * dpr); canvas.height = Math.floor(rect.height * dpr);
            const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (data) draw();
        };
        resize();
        const ro = new ResizeObserver(resize); ro.observe(canvas.parentElement || canvas);
        window.addEventListener("resize", resize);
        return () => { ro.disconnect(); window.removeEventListener("resize", resize); };
    }, [data, draw]);

    // ----- interaction: drag to pan, wheel to zoom, hover tracking -----
    useEffect(() => {
        const canvas = canvasRef.current; if (!canvas || !data) return;
        let isDown = false;
        let pointerId = null;

        const getChartMetrics = () => {
            const rect = canvas.getBoundingClientRect();
            const chartLeft = 50; const chartRight = rect.width - 110; const chartWidth = chartRight - chartLeft;
            const s = viewRef.current.startIndex; const e = viewRef.current.endIndex; const n = Math.max(1, e - s);
            const spacing = chartWidth / n;
            return { rect, chartLeft, chartRight, chartWidth, spacing, s, e, n };
        };

        const onPointerDown = (ev) => {
            if (ev.pointerType === "mouse" && ev.button !== 0) return;
            canvas.setPointerCapture(ev.pointerId);
            isDown = true; pointerId = ev.pointerId;
            const { rect } = getChartMetrics();
            viewRef.current.isDragging = true;
            viewRef.current.dragStartX = ev.clientX - rect.left;
            viewRef.current.dragStartStartIndex = viewRef.current.startIndex;
            canvas.style.cursor = "grabbing";
        };

        const onPointerMove = (ev) => {
            if (!isDown || !viewRef.current.isDragging) return;
            const { rect, spacing, n } = getChartMetrics();
            const mouseX = ev.clientX - rect.left;
            const dx = mouseX - viewRef.current.dragStartX;
            const candlesMoved = Math.round(-dx / spacing);
            const newStart = Math.max(0, Math.min(data.dates.length - n, viewRef.current.dragStartStartIndex + candlesMoved));
            viewRef.current.startIndex = newStart;
            viewRef.current.endIndex = newStart + n;
            draw();
        };

        const onPointerUp = (ev) => {
            if (pointerId !== ev.pointerId) return;
            isDown = false; pointerId = null; viewRef.current.isDragging = false;
            try { canvas.releasePointerCapture(ev.pointerId); } catch (e) { }
            canvas.style.cursor = "crosshair";
        };

        const onWheel = (ev) => {
            ev.preventDefault();
            const { rect, chartLeft, chartWidth, s, e, n } = getChartMetrics();
            const mouseX = ev.clientX - rect.left;
            const mouseRatio = (mouseX - chartLeft) / chartWidth;
            const zoomFactor = ev.deltaY > 0 ? 1.15 : 0.85;
            let currentRange = e - s;
            let newRange = Math.max(10, Math.min(data.dates.length, Math.round(currentRange * zoomFactor)));
            const centerIndex = s + currentRange * (mouseRatio || 0.5);
            let newStart = Math.max(0, Math.min(data.dates.length - newRange, Math.round(centerIndex - newRange * (mouseRatio || 0.5))));
            viewRef.current.startIndex = newStart;
            viewRef.current.endIndex = newStart + newRange;
            draw();
        };

        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("wheel", onWheel, { passive: false });

        // hover tracking: update hoverIndex while over chart; on leave revert to latest (unless pinned)
        const onHover = (ev) => {
            const rect = canvas.getBoundingClientRect();
            const x = ev.clientX - rect.left;
            const chartLeft = 50, chartRight = rect.width - 110; const chartWidth = chartRight - chartLeft;
            const s = viewRef.current.startIndex, e = viewRef.current.endIndex; const n = Math.max(1, e - s);
            const spacing = chartWidth / n;
            const idx = Math.floor((x - chartLeft) / spacing);
            if (idx < 0 || idx >= n) { hoverIndexRef.current = null; setHoverIndex(null); return; }
            hoverIndexRef.current = s + idx; setHoverIndex(s + idx);
        };
        const onLeave = () => {
            // when mouse leaves, show latest (unless user pinned a particular index)
            hoverIndexRef.current = null;
            setHoverIndex(null); // will let Info Card revert to latest unless pinned
        };

        canvas.addEventListener("mousemove", onHover);
        canvas.addEventListener("mouseleave", onLeave);

        return () => {
            canvas.removeEventListener("pointerdown", onPointerDown);
            canvas.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            canvas.removeEventListener("wheel", onWheel);
            canvas.removeEventListener("mousemove", onHover);
            canvas.removeEventListener("mouseleave", onLeave);
        };
    }, [data, presetView, draw]);



    // redraw when data or hoverIndex changes
    useEffect(() => { draw(); }, [data, draw, hoverIndex]);

    // info card helper: compute the index to show
    const infoIndexToShow = () => {
        if (!data) return null;
        if (pinnedIndex !== null && Number.isInteger(pinnedIndex) && pinnedIndex >= 0 && pinnedIndex < data.dates.length) return pinnedIndex;
        if (hoverIndex !== null) return hoverIndex;
        // default latest index = last valid close index
        for (let i = data.dates.length - 1; i >= 0; i--) {
            if (data.close[i] !== null && !isNaN(data.close[i])) return i;
        }
        return data.dates.length - 1;
    };

    const infoAtIndex = (idx) => {
        if (!data || idx === null) return null;
        if (idx < 0 || idx >= data.dates.length) return null;
        return {
            date: data.dates[idx],
            open: data.open[idx], high: data.high[idx], low: data.low[idx], close: data.close[idx], volume: data.volume[idx],
            smaShort: data.smaShort ? data.smaShort[idx] : null,
            smaLong: data.smaLong ? data.smaLong[idx] : null,
            emaShort: data.emaShort ? data.emaShort[idx] : null,
            bbUpper: data.bb_upper ? data.bb_upper[idx] : null,
            bbLower: data.bb_lower ? data.bb_lower[idx] : null,
            rsi: data.rsi14 ? data.rsi14[idx] : null,
            macd: data.macd ? data.macd[idx] : null,
            macdSignal: data.macdSignal ? data.macdSignal[idx] : null,
            macdHist: data.macdHist ? data.macdHist[idx] : null,
        };
    };

    // helper to return a small styled badge element (JSX)
    const Badge = ({ text, color = "#333", bg = "#eee" }) => (
        <span style={{
            display: "inline-block",
            padding: "4px 8px",
            borderRadius: 6,
            background: bg,
            color,
            fontWeight: 600,
            fontSize: 12,
            marginRight: 8
        }}>{text}</span>
    );

    // UI: compute latest signals and badge color
    const latestSignals = data ? evaluateSignals(data.dates.length - 1) : null;
    const badgeStyle = (rec) => {
        if (!rec) return { background: "#ddd", color: "#222" };
        if (rec.includes("Strong Buy")) return { background: "#007f33", color: "#fff" };
        if (rec === "Buy") return { background: "#2e7d32", color: "#fff" };
        if (rec === "Hold") return { background: "#9e9e9e", color: "#fff" };
        if (rec === "Sell") return { background: "#c62828", color: "#fff" };
        if (rec.includes("Strong Sell")) return { background: "#8b0000", color: "#fff" };
        return { background: "#ddd", color: "#222" };
    };

    // ---------- render ----------
    const infoIndex = infoIndexToShow();
    const info = infoAtIndex(infoIndex);
    const sig = infoIndex !== null ? evaluateSignals(infoIndex) : null;

    return (
        <div ref={containerRef} style={{ padding: 12, background: "#f7f9fc" }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ background: "#fff", padding: 10, borderRadius: 8, border: "1px solid #e9eef8", display: "flex", gap: 12, alignItems: "center" }}>
                    <div>
                        <strong style={{ fontSize: 16 }}>Indicators</strong>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        View:
                        <select value={presetView} onChange={(e) => setPresetView(e.target.value)} style={{ marginLeft: 8 }}>
                            <option value="30">30</option>
                            <option value="60">60</option>
                            <option value="120">120</option>
                            <option value="250">250</option>
                            <option value="all">All</option>
                        </select>
                    </label>

                    <button onClick={() => {
                        if (!data) return;
                        const total = data.dates.length;
                        const initial = presetView === "all" ? total : Math.min(total, Number(presetView || 120));
                        viewRef.current.startIndex = Math.max(0, total - initial); viewRef.current.endIndex = total; draw();
                    }} style={{ marginLeft: 8, background: "#2962ff", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 6 }}>
                        Reset View
                    </button>
                </div>

                <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 12 }}>Short SMA</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={smaShortInput}
                            onChange={(e) => setSmaShortInput(e.target.value)}
                            onBlur={() => {
                                const parsed = parseInt(smaShortInput.replace(/\D/g, ""), 10);
                                const applied = Number.isFinite(parsed) ? Math.max(2, Math.min(200, parsed)) : smaPeriodShort;
                                setSmaPeriodShort(applied);
                                setSmaShortInput(String(applied));
                            }}
                            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                            style={{ width: 64 }}
                        />
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 12 }}>Long SMA</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={smaLongInput}
                            onChange={(e) => setSmaLongInput(e.target.value)}
                            onBlur={() => {
                                const parsed = parseInt(smaLongInput.replace(/\D/g, ""), 10);
                                const applied = Number.isFinite(parsed) ? Math.max(2, Math.min(400, parsed)) : smaPeriodLong;
                                setSmaPeriodLong(applied);
                                setSmaLongInput(String(applied));
                            }}
                            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                            style={{ width: 64 }}
                        />
                    </div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 12 }}>
                <div style={{ background: "#fff", padding: 8, borderRadius: 8, border: "1px solid #e9eef8" }}>
                    <canvas ref={canvasRef} style={{ width: "100%", height: 640, display: "block", borderRadius: 6, cursor: "crosshair" }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* Info Card — always visible */}
                    <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #e9eef8" }}>

                        <div>
                            {!info && <div style={{ color: "#666" }}>No data</div>}
                            {!!info && (
                                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                                        <div>
                                            <div><strong>{info.date}</strong></div>
                                            <div style={{ color: "#666", fontSize: 13 }}>Open: Rs. {info.open?.toFixed(2) ?? "—"}</div>
                                        </div>

                                        <div style={{ textAlign: "right" }}>
                                            <div style={{ fontSize: 18, fontWeight: 700 }}>Rs. {info.close?.toFixed(2) ?? "—"}</div>
                                            <div style={{ color: "#666", fontSize: 13 }}>Vol: {info.volume?.toLocaleString() ?? "—"}</div>
                                        </div>
                                    </div>

                                    <hr style={{ margin: "8px 0" }} />
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                            {/* RSI badge */}
                                            {showRSI && (
                                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                    <Badge
                                                        text={sig?.rsi?.label ?? "RSI —"}
                                                        color={sig?.rsi?.color ?? "#222"}
                                                        bg={
                                                            sig?.rsi?.color
                                                                ? sig.rsi.color === "#9e9e9e"
                                                                    ? "#eee"
                                                                    : `${sig.rsi.color}1A`
                                                                : "#eee"
                                                        }
                                                    />
                                                    <span style={{ fontSize: 13, color: "#444" }}>
                                                        {sig?.rsiV ? `${sig.rsiV.toFixed(1)}` : "—"}
                                                    </span>
                                                    <span style={{ fontSize: 12, color: "#777" }}>
                                                        {sig?.rsi?.label === "Overbought"
                                                            ? "Momentum: Price may drop soon."
                                                            : sig?.rsi?.label === "Oversold"
                                                                ? "Momentum: Price may rise soon."
                                                                : "Momentum: Stable zone."}
                                                    </span>
                                                </div>
                                            )}

                                            {/* MACD badge */}
                                            {showMACD && (
                                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                    <Badge
                                                        text={sig?.macd?.label ?? "MACD —"}
                                                        color={sig?.macd?.color ?? "#222"}
                                                        bg={
                                                            sig?.macd?.color
                                                                ? sig.macd.color === "#9e9e9e"
                                                                    ? "#eee"
                                                                    : `${sig.macd.color}1A`
                                                                : "#eee"
                                                        }
                                                    />
                                                    <span style={{ fontSize: 13, color: "#444" }}>
                                                        {sig?.macdV != null ? sig.macdV.toFixed(3) : "—"}
                                                    </span>
                                                    <span style={{ fontSize: 12, color: "#777" }}>
                                                        {sig?.macd?.label === "Bullish"
                                                            ? "Signal: Upward momentum (Buy)"
                                                            : sig?.macd?.label === "Bearish"
                                                                ? "Signal: Downward momentum (Sell)"
                                                                : "Signal: Neutral / Hold"}
                                                    </span>
                                                </div>
                                            )}



                                        </div>
                                    </div>
                                    <hr style={{ margin: "8px 0" }} />
                                    <div>
                                        <div style={{ marginTop: 6 }}>
                                            {showSMA20 && <div>SMA {smaPeriodShort}: {info.smaShort ? info.smaShort.toFixed(2) : "—"}</div>}
                                            {showSMA50 && <div>SMA {smaPeriodLong}: {info.smaLong ? info.smaLong.toFixed(2) : "—"}</div>}
                                            {showEMA20 && <div>EMA {smaPeriodShort}: {info.emaShort ? info.emaShort.toFixed(2) : "—"}</div>}
                                            {showBB && <div>Bollinger: {info.bbLower ? info.bbLower.toFixed(2) : "—"} — {info.bbUpper ? info.bbUpper.toFixed(2) : "—"}</div>}
                                            {showRSI && <div>RSI: {info.rsi ? info.rsi.toFixed(1) : "—"} ({sig?.rsi.label ?? "—"})</div>}
                                            {showMACD && <div>MACD: {info.macd != null ? info.macd.toFixed(3) : "—"} (signal {info.macdSignal != null ? info.macdSignal.toFixed(3) : "—"})</div>}
                                        </div>
                                    </div>


                                </div>
                            )}
                        </div>
                    </div>

                    {/* Toggles / Legend */}
                    <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #e9eef8" }}>
                        <strong>Toggle</strong>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                            <label><input type="checkbox" checked={showSMA20} onChange={(e) => setShowSMA20(e.target.checked)} /> SMA {smaPeriodShort}</label>
                            <label><input type="checkbox" checked={showSMA50} onChange={(e) => setShowSMA50(e.target.checked)} /> SMA {smaPeriodLong}</label>
                            <label><input type="checkbox" checked={showEMA20} onChange={(e) => setShowEMA20(e.target.checked)} /> EMA {smaPeriodShort}</label>
                            <label><input type="checkbox" checked={showBB} onChange={(e) => setShowBB(e.target.checked)} /> Bollinger</label>
                            <label><input type="checkbox" checked={showMACD} onChange={(e) => setShowMACD(e.target.checked)} /> MACD</label>
                            <label><input type="checkbox" checked={showRSI} onChange={(e) => setShowRSI(e.target.checked)} /> RSI</label>
                            <label><input type="checkbox" checked={showVolume} onChange={(e) => setShowVolume(e.target.checked)} /> Volume</label>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
