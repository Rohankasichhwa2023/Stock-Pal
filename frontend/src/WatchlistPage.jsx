import React, { useEffect, useState, useContext } from "react";
import api from "./api";
import { AuthContext } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "./component/Navbar";
import "./WatchlistPage.css";

const WatchlistPage = () => {
    const { accessToken } = useContext(AuthContext);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!accessToken) {
            navigate("/login");
            return;
        }

        const fetchWatchlistAndPredictions = async () => {
            try {
                setLoading(true);
                const res = await api.get("/watchlist/");
                const watchItems = res.data || [];

                if (watchItems.length === 0) {
                    setItems([]);
                    return;
                }

                // Build unique list of symbols to avoid duplicate requests
                const uniqueSymbols = Array.from(new Set(watchItems.map((w) => w.symbol)));

                // Prepare prediction requests in parallel
                const predictionPromises = uniqueSymbols.map((sym) =>
                    api
                        .get(`http://127.0.0.1:8000/api/prediction/${sym}/`)
                        .then((r) => ({ symbol: sym, data: r.data }))
                        .catch((err) => {
                            // swallow errors per-symbol and return null data
                            console.error(`Prediction fetch failed for ${sym}:`, err?.message || err);
                            return { symbol: sym, data: null };
                        })
                );

                const predictions = await Promise.all(predictionPromises);

                // Map predictions by symbol for quick lookup
                const predMap = new Map();
                for (const p of predictions) {
                    if (p.data && p.data.next_day_prediction) {
                        predMap.set(p.symbol, {
                            pred_movement: p.data.next_day_prediction.pred_movement,
                            pred_price:
                                p.data.next_day_prediction.pred_price != null
                                    ? Number(p.data.next_day_prediction.pred_price)
                                    : null,
                        });
                    } else {
                        predMap.set(p.symbol, null);
                    }
                }

                // Attach prediction info to each watchlist item
                const merged = watchItems.map((it) => ({
                    ...it,
                    prediction: predMap.get(it.symbol) || null,
                }));

                setItems(merged);
            } catch (err) {
                console.error("Failed to fetch watchlist", err);
                setItems([]);
            } finally {
                setLoading(false);
            }
        };

        fetchWatchlistAndPredictions();
    }, [accessToken, navigate]);

    const handleGoToCompany = (symbol) => {
        navigate(`/company/${symbol}`);
    };

    const renderPredictionBadge = (prediction) => {
        if (!prediction) {
            return <span style={badgeStyle("gray")}>N/A</span>;
        }
        const movement = String(prediction.pred_movement || "").toLowerCase();
        if (movement === "up" || movement === "positive") {
            return (
                <span style={badgeStyle("green")}>
                    ▲ {prediction.pred_movement} {prediction.pred_price != null ? `• ${prediction.pred_price.toFixed(2)}` : ""}
                </span>
            );
        }
        if (movement === "down" || movement === "negative") {
            return (
                <span style={badgeStyle("red")}>
                    ▼ {prediction.pred_movement} {prediction.pred_price != null ? `• ${prediction.pred_price.toFixed(2)}` : ""}
                </span>
            );
        }
        // fallback for unexpected labels
        return (
            <span style={badgeStyle("gray")}>
                {prediction.pred_movement ?? "Unknown"} {prediction.pred_price != null ? `• ${prediction.pred_price.toFixed(2)}` : ""}
            </span>
        );
    };

    const badgeStyle = (color) => {
        const base = {
            display: "inline-block",
            padding: "4px 8px",
            borderRadius: "12px",
            fontWeight: 600,
            fontSize: "0.9rem",
        };
        if (color === "green") return { ...base, background: "#e6f8ee", color: "#0b6b33", border: "1px solid #b9f0c9" };
        if (color === "red") return { ...base, background: "#ffecec", color: "#b91c1c", border: "1px solid #f7bdbd" };
        return { ...base, background: "#f0f0f0", color: "#555", border: "1px solid #ddd" };
    };

    return (
        <>
            <Navbar />
            <div className="watchlist-container">
                <h2 className="watchlist-title">Your Watchlist</h2>

                {loading ? (
                    <p className="watchlist-loading">Loading your data...</p>
                ) : items.length === 0 ? (
                    <div className="watchlist-empty">
                        <p>Your watchlist is empty.</p>
                        <p className="tip-text">Add companies from their detail pages to track them here.</p>
                    </div>
                ) : (
                    <table className="watchlist-table">
                        <thead>
                            <tr>
                                <th>Symbol</th>
                                <th>Added On</th>
                                <th>Prediction</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((it) => (
                                <tr key={it.id}>
                                    <td className="symbol">{it.symbol}</td>
                                    <td>{new Date(it.added_at).toLocaleString()}</td>
                                    <td>{renderPredictionBadge(it.prediction)}</td>
                                    <td>
                                        <button
                                            className="view-btn"
                                            onClick={() => handleGoToCompany(it.symbol)}
                                        >
                                            View Company
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
};

export default WatchlistPage;
