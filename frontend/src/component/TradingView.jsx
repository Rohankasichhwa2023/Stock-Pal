// TradingView.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

/*
  Improvements:
  - Responsive, DPR-correct canvas
  - View / interaction stored in refs to avoid frequent re-renders
  - RequestAnimationFrame-based drawing (efficient)
  - Pointer events for consistent dragging across devices
  - Wheel zoom centered at mouse position
  - Clean teardown of listeners
  - Helpful console warnings and safe numeric parsing
*/

export default function TradingView() {
    const { symbol } = useParams();
    const canvasRef = useRef(null);
    const tooltipRef = useRef(null);
    const containerRef = useRef(null);

    // main data state (when data changes we re-render UI)
    const [data, setData] = useState(null);
    const [latestInfo, setLatestInfo] = useState(null);
    const [uiVersion, setUiVersion] = useState(0); // bump to update displayed text like date range

    // view and interaction stored in refs to avoid frequent re-renders while dragging/zooming
    const viewRef = useRef({
        startIndex: 0,
        endIndex: 0,
        isDragging: false,
        dragStartX: 0,
        dragStartStartIndex: 0,
    });

    const rafRef = useRef(null);
    const dprRef = useRef(1);
    const drawRequestedRef = useRef(false);

    // ----- Helpers -----
    const toNumberSafe = (v) => {
        if (v === null || v === undefined) return null;
        if (typeof v === "number" && Number.isFinite(v)) return v;
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
        const mapNum = (arr) => arr.map(toNumberSafe);
        return {
            dates,
            open: mapNum(ensure("open")),
            high: mapNum(ensure("high")),
            low: mapNum(ensure("low")),
            close: mapNum(ensure("close")),
            volume: mapNum(ensure("volume")),
            sma20: mapNum(ensure("sma20")),
            sma50: mapNum(ensure("sma50")),
            // add other indicators as needed
        };
    };

    // ----- Fetch data -----
    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            try {
                const url = `http://127.0.0.1:8000/api/${symbol}/`;
                const res = await axios.get(url);
                if (cancelled) return;
                if (!res.data || !res.data.chart) {
                    console.error("API returned no chart data", res.data);
                    return;
                }
                const aligned = alignSeries(res.data.chart);
                setData(aligned);
                if (res.data.latest) setLatestInfo(res.data.latest);

                // initialize view: last N candles
                const total = aligned.dates.length;
                const initialView = Math.min(120, total);
                viewRef.current.startIndex = Math.max(0, total - initialView);
                viewRef.current.endIndex = total;
                setUiVersion((v) => v + 1);
            } catch (err) {
                console.error("Error fetching stock data:", err);
            }
        };
        fetchData();
        return () => {
            cancelled = true;
        };
    }, [symbol]);

    // ----- Resize & DPR handling -----
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const container = containerRef.current || canvas.parentElement;
        const handleResize = () => {
            const rect = container.getBoundingClientRect();
            const dpr = Math.max(1, window.devicePixelRatio || 1);
            dprRef.current = dpr;
            // set CSS size and canvas pixel size for crispness
            canvas.style.width = `${Math.floor(rect.width)}px`;
            canvas.style.height = `${Math.floor(500)}px`; // fixed height; change if you want responsive height
            canvas.width = Math.floor(rect.width * dpr);
            canvas.height = Math.floor(500 * dpr);
            // scaling context
            const ctx = canvas.getContext("2d");
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            requestDraw(); // redraw at new size
        };

        handleResize();
        const ro = new ResizeObserver(handleResize);
        ro.observe(container);
        window.addEventListener("orientationchange", handleResize);
        return () => {
            ro.disconnect();
            window.removeEventListener("orientationchange", handleResize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasRef.current, containerRef.current]);

    // ----- Drawing logic -----
    const requestDraw = useCallback(() => {
        if (drawRequestedRef.current) return;
        drawRequestedRef.current = true;
        rafRef.current = requestAnimationFrame(() => {
            drawRequestedRef.current = false;
            drawChart();
        });
    }, [data]);

    const drawChart = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data || !data.dates || data.dates.length === 0) {
            // clear canvas if present
            if (canvas) {
                const ctx = canvas.getContext("2d");
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            return;
        }

        const ctx = canvas.getContext("2d");
        const cssWidth = canvas.clientWidth;
        const cssHeight = canvas.clientHeight;

        // layout
        const padding = { top: 20, right: 80, bottom: 60, left: 10 };
        const chartWidth = cssWidth - padding.left - padding.right;
        const mainChartHeight = cssHeight - padding.top - padding.bottom - 100;
        const volumeHeight = 80;
        const total = data.dates.length;

        // clamp start/end using viewRef
        let s = Math.max(0, Math.min(viewRef.current.startIndex, total - 1));
        let e = Math.max(s + 1, Math.min(viewRef.current.endIndex, total));
        // ensure indices within arrays with numeric lengths
        const minLen = Math.min(
            data.dates.length,
            data.open.length,
            data.high.length,
            data.low.length,
            data.close.length,
            data.volume.length
        );
        s = Math.max(0, Math.min(s, minLen - 1));
        e = Math.max(s + 1, Math.min(e, minLen));
        viewRef.current.startIndex = s;
        viewRef.current.endIndex = e;

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
        if (n <= 0) return;

        // clear background
        ctx.clearRect(0, 0, cssWidth, cssHeight);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, cssWidth, cssHeight);

        // compute candle spacing & size
        const candleSpacing = chartWidth / n;
        const candleWidth = Math.max(2, candleSpacing * 0.7);

        // compute price range safely
        const highs = visible.high.filter((v) => v !== null && !isNaN(v));
        const lows = visible.low.filter((v) => v !== null && !isNaN(v));
        if (highs.length === 0 || lows.length === 0) {
            console.warn("No valid high/low to render chart");
            return;
        }
        const maxPrice = Math.max(...highs);
        const minPrice = Math.min(...lows);
        const priceRange = (maxPrice - minPrice) || 1;
        const pricePadding = priceRange * 0.05;
        const priceToY = (price) =>
            padding.top + mainChartHeight * (1 - (price - minPrice + pricePadding) / (priceRange + pricePadding * 2));

        // grid
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
            ctx.lineTo(cssWidth - padding.right, y);
            ctx.stroke();
            ctx.fillText(price.toFixed(2), cssWidth - padding.right + 6, y + 4);
        }

        // vertical date grid lines
        const dateGridInterval = Math.max(1, Math.floor(n / 8));
        ctx.textAlign = "center";
        const dateFormatOptions = n < 90 ? { month: "short", day: "numeric" } : n < 365 ? { month: "short", year: "2-digit" } : { year: "numeric" };

        for (let i = 0; i < n; i += dateGridInterval) {
            const x = padding.left + candleSpacing * i + candleSpacing / 2;
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, cssHeight - padding.bottom);
            ctx.stroke();
            const dateObj = new Date(visible.dates[i]);
            const dateStr = isNaN(dateObj) ? "" : dateObj.toLocaleDateString("en-US", dateFormatOptions);
            ctx.fillStyle = "#787b86";
            ctx.fillText(dateStr, x, cssHeight - padding.bottom + 20);
        }

        // draw candles
        for (let i = 0; i < n; i++) {
            const open = visible.open[i];
            const close = visible.close[i];
            const high = visible.high[i];
            const low = visible.low[i];
            if ([open, close, high, low].some((v) => v === null || isNaN(v))) continue;

            const x = padding.left + candleSpacing * i + candleSpacing / 2;
            const isGreen = close >= open;
            const color = isGreen ? "#089981" : "#F23645";

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

        // current price horizontal dashed line
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
            ctx.lineTo(cssWidth - padding.right, y);
            ctx.stroke();
            ctx.setLineDash([]);
            // box with price at right
            const openAtLatest = visible.open[latestIdx];
            const isGreen = openAtLatest !== null ? latestPrice >= openAtLatest : true;
            ctx.fillStyle = isGreen ? "#089981" : "#F23645";
            ctx.fillRect(cssWidth - padding.right, y - 10, padding.right - 6, 20);
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText(latestPrice.toFixed(2), cssWidth - padding.right / 2, y + 4);
        }

        // volumes (bottom)
        const volumes = visible.volume.filter((v) => v !== null && !isNaN(v));
        const maxVolume = volumes.length ? Math.max(...volumes) : 1;
        const volumeBaseY = cssHeight - padding.bottom;
        for (let i = 0; i < n; i++) {
            const vol = visible.volume[i];
            if (vol === null || isNaN(vol)) continue;
            const open = visible.open[i];
            const close = visible.close[i];
            const x = padding.left + candleSpacing * i;
            const volHeight = (vol / maxVolume) * volumeHeight;
            const isGreen = open !== null && close !== null ? close >= open : true;
            ctx.fillStyle = isGreen ? "rgba(38,166,154,0.5)" : "rgba(239,83,80,0.5)";
            ctx.fillRect(x, volumeBaseY - volHeight, candleWidth, volHeight);
        }

        // volume label
        ctx.fillStyle = "#787b86";
        ctx.textAlign = "left";
        ctx.fillText("Volume", padding.left + 6, volumeBaseY - volumeHeight - 8);

        // done
    }, [data]);

    // whenever data or view changes, request draw
    useEffect(() => {
        requestDraw();
    }, [data, requestDraw, uiVersion]);

    // ----- Pointer & Wheel handlers -----
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data) return;

        let isPointerDown = false;
        let pointerId = null;

        // helper to translate clientX -> index
        const clientXToIndex = (clientX) => {
            const rect = canvas.getBoundingClientRect();
            const cssWidth = rect.width;
            const padding = { left: 10, right: 80 };
            const chartWidth = cssWidth - padding.left - padding.right;
            const s = viewRef.current.startIndex;
            const e = viewRef.current.endIndex;
            const n = Math.max(1, e - s);
            const candleSpacing = chartWidth / n;
            const x = clientX - rect.left;
            return Math.floor((x - padding.left) / candleSpacing);
        };

        // pointerdown -> start dragging
        const onPointerDown = (ev) => {
            if (ev.pointerType === "mouse" && ev.button !== 0) return; // only left button
            canvas.setPointerCapture(ev.pointerId);
            isPointerDown = true;
            pointerId = ev.pointerId;
            const rect = canvas.getBoundingClientRect();
            viewRef.current.isDragging = true;
            viewRef.current.dragStartX = ev.clientX - rect.left;
            viewRef.current.dragStartStartIndex = viewRef.current.startIndex;
            canvas.style.cursor = "grabbing";
        };

        const onPointerMove = (ev) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = ev.clientX - rect.left;
            if (viewRef.current.isDragging && isPointerDown) {
                const s = viewRef.current.dragStartStartIndex;
                const startX = viewRef.current.dragStartX;
                const cssWidth = rect.width;
                const padding = { left: 10, right: 80 };
                const chartWidth = cssWidth - padding.left - padding.right;
                const n = Math.max(1, viewRef.current.endIndex - viewRef.current.startIndex);
                const candleSpacing = chartWidth / n;
                const dx = mouseX - startX;
                const candlesMoved = Math.round(-dx / candleSpacing);
                const newStart = Math.max(0, Math.min(data.dates.length - n, s + candlesMoved));
                viewRef.current.startIndex = newStart;
                viewRef.current.endIndex = newStart + n;
                // update UI text occasionally
                if (Math.random() > 0.75) setUiVersion((v) => v + 1);
                requestDraw();
                return;
            }

            // tooltip
            const idx = clientXToIndex(ev.clientX);
            const sIdx = viewRef.current.startIndex;
            const eIdx = viewRef.current.endIndex;
            const visibleN = Math.max(0, eIdx - sIdx);
            const tooltip = tooltipRef.current;
            if (!tooltip) return;
            if (idx >= 0 && idx < visibleN) {
                const visibleIndex = sIdx + idx;
                const date = data.dates[visibleIndex];
                const o = data.open[visibleIndex];
                const h = data.high[visibleIndex];
                const l = data.low[visibleIndex];
                const c = data.close[visibleIndex];
                const v = data.volume[visibleIndex];
                tooltip.style.display = "block";
                tooltip.style.left = `${ev.clientX + 12}px`;
                tooltip.style.top = `${ev.clientY + 12}px`;
                tooltip.innerHTML = `
          <strong>${date}</strong><br/>
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

        const onPointerUp = (ev) => {
            if (pointerId !== ev.pointerId) return;
            isPointerDown = false;
            pointerId = null;
            viewRef.current.isDragging = false;
            canvas.releasePointerCapture(ev.pointerId);
            canvas.style.cursor = "crosshair";
            setUiVersion((v) => v + 1);
            requestDraw();
        };

        const onWheel = (ev) => {
            ev.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const cssWidth = rect.width;
            const padding = { left: 10, right: 80 };
            const chartWidth = cssWidth - padding.left - padding.right;
            const mouseRatio = (ev.clientX - rect.left - padding.left) / chartWidth;
            const currentRange = viewRef.current.endIndex - viewRef.current.startIndex;
            const zoomFactor = ev.deltaY > 0 ? 1.15 : 0.85;
            const newRange = Math.max(10, Math.min(data.dates.length, Math.round(currentRange * zoomFactor)));
            const centerIndex = viewRef.current.startIndex + currentRange * (mouseRatio || 0.5);
            const newStart = Math.max(0, Math.min(data.dates.length - newRange, Math.round(centerIndex - newRange * (mouseRatio || 0.5))));
            viewRef.current.startIndex = newStart;
            viewRef.current.endIndex = newStart + newRange;
            setUiVersion((v) => v + 1);
            requestDraw();
        };

        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("wheel", onWheel, { passive: false });

        // after existing listener registrations (pointerdown/pointermove/pointerup/wheel)
        const hideTooltip = () => {
            const t = tooltipRef.current;
            if (t) {
                t.style.display = "none";
                t.innerHTML = ""; // clear stale HTML
            }
        };

        // add extra listeners that hide tooltip when pointer leaves or page scrolls/loses focus
        canvas.addEventListener("pointerleave", hideTooltip);
        canvas.addEventListener("pointercancel", hideTooltip);

        // also hide when the chart container loses pointer (use container if available)
        const container = canvas.parentElement; // or use your containerRef if you added one
        if (container) {
            container.addEventListener("mouseleave", hideTooltip);
            container.addEventListener("touchstart", hideTooltip, { passive: true });
        }

        // hide on page-level events (scroll, wheel, blur) to prevent tooltip sticking when user scrolls
        window.addEventListener("scroll", hideTooltip, { passive: true });
        window.addEventListener("wheel", hideTooltip, { passive: true });
        window.addEventListener("blur", hideTooltip);

        // CLEANUP: remove everything we added
        return () => {
            canvas.removeEventListener("pointerdown", onPointerDown);
            canvas.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            canvas.removeEventListener("wheel", onWheel);

            canvas.removeEventListener("pointerleave", hideTooltip);
            canvas.removeEventListener("pointercancel", hideTooltip);

            if (container) {
                container.removeEventListener("mouseleave", hideTooltip);
                container.removeEventListener("touchstart", hideTooltip);
            }

            window.removeEventListener("scroll", hideTooltip);
            window.removeEventListener("wheel", hideTooltip);
            window.removeEventListener("blur", hideTooltip);
        };


    }, [data, requestDraw]);

    // cleanup RAF on unmount
    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    // UI helpers
    const resetView = () => {
        if (!data || !data.dates) return;
        const total = data.dates.length;
        const initial = Math.min(120, total);
        viewRef.current.startIndex = Math.max(0, total - initial);
        viewRef.current.endIndex = total;
        setUiVersion((v) => v + 1);
        requestDraw();
    };

    const visibleRangeText = () => {
        if (!data || !data.dates) return "";
        const s = viewRef.current.startIndex;
        const e = Math.max(0, viewRef.current.endIndex - 1);
        const safeDate = (idx) => {
            const d = data.dates[Math.max(0, Math.min(idx, data.dates.length - 1))];
            const dateObj = new Date(d);
            return isNaN(dateObj) ? "" : dateObj.toLocaleDateString();
        };
        return `${safeDate(s)} → ${safeDate(e)} (${viewRef.current.endIndex - viewRef.current.startIndex} / ${data.dates.length})`;
    };

    // render
    return (
        <div style={{ position: "relative", backgroundColor: "#f8f9fd" }} ref={containerRef}>
            {latestInfo && (
                <div
                    className="stock-info"
                    style={{
                        backgroundColor: "#ffffff",
                        color: "#131722",
                        padding: "12px",
                        borderRadius: "8px",
                        marginBottom: "14px",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: "8px",
                        border: "1px solid #e0e3eb",
                    }}
                >
                    <div><strong>LTP:</strong> Rs. {latestInfo.close}</div>
                    <div><strong>Open:</strong> Rs. {latestInfo.open}</div>
                    <div><strong>High:</strong> Rs. {latestInfo.high}</div>
                    <div><strong>Low:</strong> Rs. {latestInfo.low}</div>
                    <div><strong>Prev Close:</strong> Rs. {latestInfo.prevClose}</div>
                    <div><strong>Volume:</strong> {latestInfo.volume?.toLocaleString()}</div>
                    <div><strong>Turnover:</strong> {latestInfo.turnover?.toLocaleString()}</div>
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
                        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                            <span style={{ color: "#131722" }}>{visibleRangeText()}</span>
                            <button
                                onClick={resetView}
                                style={{
                                    padding: "6px 12px",
                                    fontSize: "12px",
                                    backgroundColor: "#2962ff",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                }}
                            >
                                Reset View
                            </button>
                        </div>
                    )}
                </div>

                <canvas
                    ref={canvasRef}
                    style={{ display: "block", width: "100%", height: "500px", borderRadius: "4px", cursor: "crosshair" }}
                />
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
