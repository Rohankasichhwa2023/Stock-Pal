import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./PriceHistory.css";

const PriceHistory = () => {
    const { symbol } = useParams();
    const [data, setData] = useState(null); // null => loading, [] => loaded but empty
    const [page, setPage] = useState(1);
    const perPage = 10;

    // Date filter state (YYYY-MM-DD strings, empty = no filter)
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        let cancelled = false;
        setData(null);

        axios.get(`http://127.0.0.1:8000/api/history/${symbol}/`)
            .then(res => {
                // Basic robust coercion (same as before)
                let rows = [];
                if (Array.isArray(res.data)) {
                    rows = res.data;
                } else if (typeof res.data === "string") {
                    try {
                        // If backend returns string but valid JSON, parse it
                        rows = JSON.parse(res.data);
                        if (!Array.isArray(rows)) rows = [rows];
                    } catch {
                        // fallback empty
                        rows = [];
                    }
                } else if (res.data && typeof res.data === "object") {
                    // handle { results: [...] } or numeric-indexed objects
                    if (Array.isArray(res.data.results)) rows = res.data.results;
                    else if (Array.isArray(res.data.data)) rows = res.data.data;
                    else {
                        const keys = Object.keys(res.data);
                        const numericKeys = keys.filter(k => /^\d+$/.test(k));
                        if (numericKeys.length === keys.length && numericKeys.length > 0) {
                            rows = numericKeys
                                .map(k => ({ k: Number(k), v: res.data[k] }))
                                .sort((a, b) => a.k - b.k)
                                .map(x => x.v);
                        } else {
                            rows = [res.data];
                        }
                    }
                } else {
                    rows = [];
                }

                if (!cancelled) {
                    setData(rows);
                    setPage(1);
                }
            })
            .catch(err => {
                console.error("PriceHistory fetch error:", err);
                if (!cancelled) setData([]);
            });

        return () => { cancelled = true; };
    }, [symbol]);

    // When filters change, go to first page
    useEffect(() => {
        setPage(1);
    }, [startDate, endDate]);

    // Ensure dataArr is an array
    const dataArr = Array.isArray(data) ? data : [];

    // Filter by date range (both bounds inclusive). 
    // We expect row.date in "YYYY-MM-DD". String compare works for that format.
    const filtered = dataArr.filter(row => {
        if (!row || !row.date) return false;
        const d = String(row.date);
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (page > totalPages) setPage(totalPages);

    const paginated = filtered.slice((page - 1) * perPage, page * perPage);

    const formatRs = (value) => {
        if (value === null || value === undefined || value === "") return "-";
        const num = Number(value);
        if (!Number.isFinite(num)) return "-";
        if (Math.abs(num) >= 10000000) return `Rs. ${(num / 10000000).toFixed(2)} Cr`;
        if (Math.abs(num) >= 100000) return `Rs. ${(num / 100000).toFixed(2)} L`;
        return `Rs. ${num.toLocaleString()}`;
    };

    const formatNumber = (value) => {
        if (value === null || value === undefined || value === "") return "-";
        const n = Number(value);
        return Number.isFinite(n) ? n.toLocaleString() : "-";
    };

    const clearFilters = () => {
        setStartDate("");
        setEndDate("");
        setPage(1);
    };

    return (
        <div className="price-history-container">
            <div className="price-history-header">
                <h2>Price History — {symbol?.toUpperCase()}</h2>
                <div className="price-history-actions" style={{ gap: 8, display: "flex", alignItems: "center" }}>
                    <div>
                        <label style={{ fontSize: 12, marginRight: 6 }}>Start</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            max={endDate || undefined}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, marginRight: 6 }}>End</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate || undefined}
                        />
                    </div>
                    <button className="date-range-btn" onClick={clearFilters}>Clear</button>
                    <button className="reset-btn" onClick={() => { setPage(1); }}>↻ Reset</button>

                </div>
            </div>

            <div className="table-wrapper">
                <table className="price-table">
                    <thead>
                        <tr>
                            <th>DATE</th><th>CHANGE</th><th>CHANGE %</th><th>CLOSE</th>
                            <th>TURNOVER</th><th>VOLUME</th><th>OPEN</th><th>HIGH</th><th>LOW</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data === null ? (
                            <tr><td colSpan="9" style={{ textAlign: "center" }}>Loading…</td></tr>
                        ) : paginated.length === 0 ? (
                            <tr><td colSpan="9" style={{ textAlign: "center" }}>No data</td></tr>
                        ) : (
                            paginated.map((row, i) => {
                                const changeVal = row?.change == null ? NaN : Number(row.change);
                                const isPositive = Number.isFinite(changeVal) && changeVal > 0;
                                const isNegative = Number.isFinite(changeVal) && changeVal < 0;
                                const changeDisplay = Number.isFinite(changeVal) ? `${isPositive ? "+" : ""}${changeVal.toFixed(2)}` : "-";

                                return (
                                    <tr key={i}>
                                        <td>{row?.date ?? "-"}</td>
                                        <td className={isPositive ? "positive" : isNegative ? "negative" : ""}>{changeDisplay}</td>
                                        <td>
                                            <span className={`change-badge ${isPositive ? "positive-bg" : isNegative ? "negative-bg" : ""}`}>
                                                {row?.change_percent ?? "-"}
                                            </span>
                                        </td>
                                        <td>{formatRs(row?.close)}</td>
                                        <td>{formatRs(row?.turnover)}</td>
                                        <td>{formatNumber(row?.volume)}</td>
                                        <td>{formatRs(row?.open)}</td>
                                        <td>{formatRs(row?.high)}</td>
                                        <td>{formatRs(row?.low)}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="pagination" style={{ marginTop: 12 }}>
                <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>‹ Previous</button>
                <span style={{ margin: "0 12px" }}>Page {page} of {totalPages} ({filtered.length} rows)</span>
                <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}>Next ›</button>
            </div>
        </div>
    );
};

export default PriceHistory;
