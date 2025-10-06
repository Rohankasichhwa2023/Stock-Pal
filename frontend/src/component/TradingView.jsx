// TradingView.jsx
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";


export default function TradingView() {
    const { symbol } = useParams();
    const canvasRef = useRef();
    const tooltipRef = useRef();
    const [data, setData] = useState(null);
    const [latestInfo, setLatestInfo] = useState(null);

    const [chartState, setChartState] = useState({
        startIndex: 0,
        endIndex: 0,
        isDragging: false,
        dragStartX: 0,
        dragStartIndex: 0,
    });

    // Helper: safely convert a value to number or null
    const safeNum = (v) => {
        if (v === null || v === undefined) return null;
        if (typeof v === "number") {
            if (!Number.isFinite(v)) return null;
            return v;
        }
        const n = Number(String(v).replace(/,/g, ""));
        return Number.isFinite(n) ? n : null;
    };

    // Helper: align all arrays to same min length
    // Replace the old alignSeries with this function in Company.jsx
    const alignSeries = (src) => {
        // ensure presence
        const dates = Array.isArray(src.dates) ? src.dates.slice() : [];
        const len = dates.length;

        const ensureArray = (key) => {
            if (!Array.isArray(src[key])) return Array(len).fill(null);
            // if shorter, pad with nulls
            if (src[key].length < len) {
                return src[key].slice(0, src[key].length).concat(Array(len - src[key].length).fill(null));
            }
            return src[key].slice(0, len);
        };

        const toNum = (v) => {
            if (v === null || v === undefined) return null;
            const n = Number(String(v).replace(/,/g, ""));
            return Number.isFinite(n) ? n : null;
        };

        const out = {
            dates,
            open: ensureArray("open").map(toNum),
            high: ensureArray("high").map(toNum),
            low: ensureArray("low").map(toNum),
            close: ensureArray("close").map(toNum),
            volume: ensureArray("volume").map(toNum),
            sma20: ensureArray("sma20").map(toNum),
            sma50: ensureArray("sma50").map(toNum),
            ema20: ensureArray("ema20").map(toNum),
            bb_upper: ensureArray("bb_upper").map(toNum),
            bb_lower: ensureArray("bb_lower").map(toNum),
            rsi14: ensureArray("rsi14").map(toNum),
            macd: ensureArray("macd").map(toNum),
            macd_signal: ensureArray("macd_signal").map(toNum),
            atr14: ensureArray("atr14").map(toNum),
            obv: ensureArray("obv").map(toNum),
        };

        // Debug log for inspection
        console.log("Aligned series lengths:", {
            dates: out.dates.length,
            open: out.open.length,
            high: out.high.length,
            low: out.low.length,
            close: out.close.length,
            volume: out.volume.length,
        });

        return out;
    };


    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const url = `http://127.0.0.1:8000/api/${symbol}/`;
                const res = await axios.get(url);
                if (!res.data || !res.data.chart) {
                    console.error("API returned no chart data", res.data);
                    return;
                }

                // Log raw lengths for debugging
                console.log("raw chart keys:", Object.keys(res.data.chart));
                console.log(
                    "raw lengths:",
                    Object.fromEntries(
                        Object.entries(res.data.chart).map(([k, v]) => [k, Array.isArray(v) ? v.length : typeof v])
                    )
                );

                const aligned = alignSeries(res.data.chart);
                setData(aligned);

                if (res.data.latest) setLatestInfo(res.data.latest);

                // Initialize view window after data is set
                const total = aligned.dates.length;
                const initialView = Math.min(120, total);
                setChartState((p) => ({
                    ...p,
                    startIndex: Math.max(0, total - initialView),
                    endIndex: total,
                }));
            } catch (err) {
                console.error("Error fetching stock data:", err);
            }
        };

        fetchData();
    }, [symbol]);

    // Main drawing effect (safe)
    useEffect(() => {
        if (!data || !data.dates || data.dates.length === 0) {
            console.warn("No data to draw");
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const padding = { top: 20, right: 80, bottom: 60, left: 10 };
        const chartWidth = width - padding.left - padding.right;
        const mainChartHeight = height - padding.top - padding.bottom - 100;
        const volumeHeight = 80;

        // clamp indices
        const total = data.dates.length;
        let s = Math.max(0, Math.min(chartState.startIndex, total));
        let e = Math.max(s + 1, Math.min(chartState.endIndex, total)); // at least 1
        const minLen = Math.min(
            data.dates.length,
            data.open.length,
            data.high.length,
            data.low.length,
            data.close.length,
            data.volume.length
        );

        // ensure s,e within minLen
        s = Math.max(0, Math.min(s, minLen - 1));
        e = Math.max(s + 1, Math.min(e, minLen));

        const visible = {
            dates: data.dates.slice(s, e),
            open: data.open.slice(s, e),
            high: data.high.slice(s, e),
            low: data.low.slice(s, e),
            close: data.close.slice(s, e),
            volume: data.volume.slice(s, e),
            sma20: (data.sma20 || []).slice(s, e),
        };

        const n = visible.dates.length;
        if (n <= 0) {
            console.warn("Visible data length 0 after clamping");
            return;
        }

        const candleSpacing = chartWidth / n;
        const candleWidth = Math.max(2, candleSpacing * 0.7);

        // price ranges: only numeric values
        const highs = visible.high.filter((v) => v !== null && !isNaN(v));
        const lows = visible.low.filter((v) => v !== null && !isNaN(v));
        if (highs.length === 0 || lows.length === 0) {
            console.warn("No valid high/low values to compute range");
            return;
        }

        const maxPrice = Math.max(...highs);
        const minPrice = Math.min(...lows);
        const priceRange = (maxPrice - minPrice) || 1;
        const pricePadding = priceRange * 0.05;

        const priceToY = (price) =>
            padding.top +
            mainChartHeight *
            (1 - (price - minPrice + pricePadding) / (priceRange + pricePadding * 2));

        // volume
        const volumes = visible.volume.filter((v) => v !== null && !isNaN(v));
        const maxVolume = volumes.length ? Math.max(...volumes) : 1;
        const volumeY = height - padding.bottom;

        // Background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        // Grid & labels
        ctx.strokeStyle = "#e0e3eb";
        ctx.lineWidth = 1;
        ctx.fillStyle = "#787b86";
        ctx.font = "11px Arial";
        ctx.textAlign = "left";

        const gridLines = 8;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (mainChartHeight / gridLines) * i;
            const price = maxPrice - (priceRange / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            ctx.fillText(price.toFixed(2), width - padding.right + 5, y + 4);
        }

        // Vertical date grid lines
        const dateGridInterval = Math.max(1, Math.floor(n / 8));
        for (let i = 0; i < n; i += dateGridInterval) {
            const x = padding.left + candleSpacing * i + candleSpacing / 2;
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, height - padding.bottom);
            ctx.stroke();
        }

        // Candles
        for (let i = 0; i < n; i++) {
            const open = visible.open[i];
            const close = visible.close[i];
            const high = visible.high[i];
            const low = visible.low[i];

            if ([open, close, high, low].some((v) => v === null || isNaN(v))) continue;

            const x = padding.left + candleSpacing * i + candleSpacing / 2;
            const isGreen = close >= open;
            const color = isGreen ? "#26a69a" : "#ef5350";

            // wick
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, priceToY(high));
            ctx.lineTo(x, priceToY(low));
            ctx.stroke();

            // body
            ctx.fillStyle = color;
            const bodyTop = priceToY(Math.max(open, close));
            const bodyBottom = priceToY(Math.min(open, close));
            const bodyHeight = Math.max(1, bodyBottom - bodyTop);
            ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
        }

        // SMA20 line
        ctx.strokeStyle = "#2962ff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < n; i++) {
            const val = visible.sma20[i];
            if (val === null || isNaN(val)) continue;
            const x = padding.left + candleSpacing * i + candleSpacing / 2;
            const y = priceToY(val);
            if (!started) {
                ctx.moveTo(x, y);
                started = true;
            } else {
                ctx.lineTo(x, y);
            }
        }
        if (started) ctx.stroke();

        // Current price line
        let latestIdx = -1;
        for (let i = n - 1; i >= 0; i--) {
            if (visible.close[i] !== null && !isNaN(visible.close[i])) {
                latestIdx = i;
                break;
            }
        }
        if (latestIdx >= 0) {
            const latestPrice = visible.close[latestIdx];
            const y = priceToY(latestPrice);
            ctx.strokeStyle = "#9598a1";
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            ctx.setLineDash([]);

            const openAtLatest = visible.open[latestIdx];
            const isGreen = openAtLatest !== null ? latestPrice >= openAtLatest : true;
            ctx.fillStyle = isGreen ? "#26a69a" : "#ef5350";
            ctx.fillRect(width - padding.right, y - 10, padding.right - 5, 20);
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText(latestPrice.toFixed(2), width - padding.right / 2, y + 4);
        }

        // Volumes
        for (let i = 0; i < n; i++) {
            const vol = visible.volume[i];
            if (vol === null || isNaN(vol)) continue;
            const open = visible.open[i];
            const close = visible.close[i];
            const x = padding.left + candleSpacing * i;
            const volHeight = (vol / maxVolume) * volumeHeight;
            const isGreen = open !== null && close !== null ? close >= open : true;
            ctx.fillStyle = isGreen ? "rgba(38,166,154,0.5)" : "rgba(239,83,80,0.5)";
            ctx.fillRect(x, volumeY - volHeight, candleWidth, volHeight);
        }

        // Date labels
        ctx.fillStyle = "#787b86";
        ctx.font = "11px Arial";
        ctx.textAlign = "center";
        for (let i = 0; i < n; i += dateGridInterval) {
            const x = padding.left + candleSpacing * i + candleSpacing / 2;
            const dateStr = visible.dates[i] ? new Date(visible.dates[i]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            ctx.fillText(dateStr, x, height - padding.bottom + 20);
        }

        // Volume label
        ctx.fillStyle = "#787b86";
        ctx.textAlign = "left";
        ctx.fillText("Volume", padding.left + 5, volumeY - volumeHeight - 5);

        // Tooltip handlers
        canvas.onmousemove = (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // dragging
            if (chartState.isDragging) {
                const dx = mouseX - chartState.dragStartX;
                const candlesMoved = Math.round(-dx / candleSpacing);
                const newStart = Math.max(0, Math.min(total - n, chartState.dragStartIndex + candlesMoved));
                setChartState((p) => ({ ...p, startIndex: newStart, endIndex: newStart + n }));
                return;
            }

            const index = Math.floor((mouseX - padding.left) / candleSpacing);
            const tooltip = tooltipRef.current;
            if (index >= 0 && index < n && mouseY > padding.top && mouseY < height - padding.bottom) {
                tooltip.style.display = "block";
                tooltip.style.left = e.clientX + 15 + "px";
                tooltip.style.top = e.clientY + 15 + "px";

                const o = visible.open[index];
                const h = visible.high[index];
                const l = visible.low[index];
                const c = visible.close[index];
                const v = visible.volume[index];

                tooltip.innerHTML = `
          <strong>${visible.dates[index]}</strong><br/>
          O: ${o !== null ? o.toFixed(2) : "—"}<br/>
          H: ${h !== null ? h.toFixed(2) : "—"}<br/>
          L: ${l !== null ? l.toFixed(2) : "—"}<br/>
          C: ${c !== null ? c.toFixed(2) : "—"}<br/>
          Vol: ${v !== null ? v.toLocaleString() : "—"}
        `;
            } else {
                tooltip.style.display = "none";
            }
        };

        canvas.onmouseleave = () => {
            tooltipRef.current.style.display = "none";
        };

        // Dragging
        canvas.onmousedown = (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            setChartState((p) => ({ ...p, isDragging: true, dragStartX: mouseX, dragStartIndex: p.startIndex }));
            canvas.style.cursor = "grabbing";
        };

        const handleMouseUp = () => {
            setChartState((p) => ({ ...p, isDragging: false }));
            canvas.style.cursor = "crosshair";
        };
        canvas.onmouseup = handleMouseUp;
        document.addEventListener("mouseup", handleMouseUp);

        // Wheel zoom
        const handleWheel = (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseRatio = (mouseX - padding.left) / chartWidth;
            const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
            const currentRange = chartState.endIndex - chartState.startIndex;
            const newRange = Math.max(10, Math.min(total, Math.round(currentRange * zoomFactor)));
            const centerIndex = chartState.startIndex + currentRange * mouseRatio;
            const newStart = Math.max(0, Math.min(total - newRange, Math.round(centerIndex - newRange * mouseRatio)));
            setChartState((p) => ({ ...p, startIndex: newStart, endIndex: newStart + newRange }));
        };
        canvas.addEventListener("wheel", handleWheel, { passive: false });

        canvas.style.cursor = "crosshair";

        return () => {
            document.removeEventListener("mouseup", handleMouseUp);
            canvas.removeEventListener("wheel", handleWheel);
        };
    }, [data, chartState.startIndex, chartState.endIndex, chartState.isDragging]);

    return (
        <div style={{ position: "relative", backgroundColor: "#f8f9fd", padding: "20px" }}>
            {latestInfo && (
                <div
                    className="stock-info"
                    style={{
                        backgroundColor: "#ffffff",
                        color: "#131722",
                        padding: "15px",
                        borderRadius: "8px",
                        marginBottom: "20px",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: "10px",
                        border: "1px solid #e0e3eb",
                    }}
                >
                    <div>
                        <strong>LTP:</strong> Rs. {latestInfo.close}
                    </div>
                    <div>
                        <strong>Open:</strong> Rs. {latestInfo.open}
                    </div>
                    <div>
                        <strong>High:</strong> Rs. {latestInfo.high}
                    </div>
                    <div>
                        <strong>Low:</strong> Rs. {latestInfo.low}
                    </div>
                    <div>
                        <strong>Prev Close:</strong> Rs. {latestInfo.prevClose}
                    </div>
                    <div>
                        <strong>Volume:</strong> {latestInfo.volume?.toLocaleString()}
                    </div>
                    <div>
                        <strong>Turnover:</strong> {latestInfo.turnover?.toLocaleString()}
                    </div>
                </div>
            )}

            <div
                style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    padding: "10px",
                    position: "relative",
                    border: "1px solid #e0e3eb",
                }}
            >
                <div
                    style={{
                        color: "#787b86",
                        fontSize: "12px",
                        marginBottom: "10px",
                        padding: "5px 10px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <span>Scroll to zoom • Click and drag to pan • Hover for details</span>
                    {data && (
                        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                            <span style={{ color: "#131722" }}>
                                {new Date(data.dates[chartState.startIndex]).toLocaleDateString()} →{" "}
                                {new Date(data.dates[Math.max(0, chartState.endIndex - 1)]).toLocaleDateString()}
                            </span>
                            <span style={{ fontWeight: "500", color: "#131722" }}>
                                {chartState.endIndex - chartState.startIndex} / {data.dates.length} candles
                            </span>
                            <button
                                onClick={() => {
                                    const total = data.dates.length;
                                    const initialView = Math.min(120, total);
                                    setChartState((p) => ({
                                        ...p,
                                        startIndex: Math.max(0, total - initialView),
                                        endIndex: total,
                                    }));
                                }}
                                style={{
                                    padding: "4px 12px",
                                    fontSize: "11px",
                                    backgroundColor: "#2962ff",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontWeight: "500",
                                }}
                            >
                                Reset View
                            </button>
                        </div>
                    )}
                </div>

                <canvas ref={canvasRef} width={1200} height={600} style={{ display: "block", borderRadius: "4px" }} />
            </div>

            <div
                ref={tooltipRef}
                style={{
                    position: "fixed",
                    pointerEvents: "none",
                    background: "rgba(255,255,255,0.98)",
                    color: "#131722",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    display: "none",
                    border: "1px solid #e0e3eb",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 1000,
                    lineHeight: "1.6",
                }}
            />
        </div>
    );
}
