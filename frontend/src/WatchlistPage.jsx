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

        const fetch = async () => {
            try {
                setLoading(true);
                const res = await api.get("/watchlist/");
                setItems(res.data || []);
            } catch (err) {
                console.error("Failed to fetch watchlist", err);
                setItems([]);
            } finally {
                setLoading(false);
            }
        };

        fetch();
    }, [accessToken, navigate]);

    const handleGoToCompany = (symbol) => {
        navigate(`/company/${symbol}`);
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
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((it) => (
                                <tr key={it.id}>
                                    <td className="symbol">{it.symbol}</td>
                                    <td>{new Date(it.added_at).toLocaleString()}</td>
                                    <td>
                                        <button
                                            className="view-btn"
                                            onClick={() => handleGoToCompany(it.symbol)}
                                        >
                                            View Details
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
