import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./PredictionCard.css";

const PredictionCard = () => {
    const { symbol } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPrediction = async () => {
            try {
                const response = await fetch(`http://127.0.0.1:8000/api/prediction/${symbol}/`);
                if (!response.ok) throw new Error(`No data found for symbol: ${symbol}`);
                const result = await response.json();
                setData(result);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchPrediction();
    }, [symbol]);

    if (loading) return <p className="prediction-card__loading">Loading prediction data...</p>;
    if (error) return <p className="prediction-card__error">{error}</p>;
    if (!data) return null;

    const { next_day_prediction, classification_metrics, predictions } = data;

    const imageUrl = `http://127.0.0.1:8000/outputs/${symbol}/${symbol}_predictions.png?ts=${Date.now()}`;

    return (
        <div className="prediction-card">
            <h2 className="prediction-card__title">{symbol} Stock Prediction</h2>

            {/* Next Day Prediction */}
            {next_day_prediction && (
                <div className="prediction-card__next-day">
                    <h3>Next Day Prediction</h3>
                    <div className="prediction-card__details">
                        <div>
                            <strong>Predicted Price:</strong> {next_day_prediction.pred_price !== null ? next_day_prediction.pred_price.toFixed(2) : "-"}
                        </div>
                        <div>
                            <strong>Movement:</strong>
                            <span className={`prediction-card__movement ${next_day_prediction.pred_movement?.toLowerCase() || ""}`}>
                                {next_day_prediction.pred_movement || "-"}
                            </span>
                        </div>
                        <div><strong>Last Close:</strong> {next_day_prediction.last_close ?? "-"}</div>
                        <div><strong>Last Date:</strong> {next_day_prediction.last_date || "-"}</div>
                    </div>
                </div>
            )}

            {/* Model Performance */}
            {classification_metrics && (
                <div className="prediction-card__metrics">
                    <h3>Model Performance</h3>
                    <div><strong>Accuracy:</strong> {classification_metrics.hybrid_accuracy !== null ? (classification_metrics.hybrid_accuracy * 100).toFixed(2) + "%" : "-"}</div>
                    <div><strong>Weighted F1:</strong> {classification_metrics.weighted_f1 !== null ? (classification_metrics.weighted_f1 * 100).toFixed(2) + "%" : "-"}</div>
                </div>
            )}

            {/* Prediction Plot */}
            <div className="prediction-card__image">
                <img src={imageUrl} alt={`${symbol} Prediction`} />
            </div>

            {/* Recent Predictions Table */}
            {predictions && predictions.length > 0 && (
                <div className="prediction-card__recent">
                    <h3>Sample Predictions (Last 30 Days)</h3>
                    <div className="prediction-card__table-wrapper">
                        <table className="prediction-card__table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Actual Close</th>
                                    <th>Pred Close</th>
                                    <th>Actual Label</th>
                                    <th>Pred Label</th>
                                </tr>
                            </thead>
                            <tbody>
                                {predictions.slice(-30).reverse().map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{item.date || "-"}</td>
                                        <td>{item.actual_close !== null ? item.actual_close : "-"}</td>
                                        <td>{item.pred_close !== null ? item.pred_close.toFixed(2) : "-"}</td>
                                        <td>
                                            <span className={`prediction-card__movement ${item.actual_label?.toLowerCase() || ""}`}>
                                                {item.actual_label || "-"}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`prediction-card__movement ${item.pred_label?.toLowerCase() || ""}`}>
                                                {item.pred_label || "-"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PredictionCard;
