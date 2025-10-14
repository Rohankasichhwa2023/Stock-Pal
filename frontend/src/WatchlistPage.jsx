import React, { useEffect, useState, useContext } from "react";
import api from "./api";
import { AuthContext } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "./component/Navbar";

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
            <div style={{ maxWidth: 900, margin: "20px auto" }}>
                <h2>Your Watchlist</h2>
                {loading ? (
                    <p>Loading...</p>
                ) : items.length === 0 ? (
                    <p>Your watchlist is empty. Add companies from the company page.</p>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th>Symbol</th>
                                <th>Added</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((it) => (
                                <tr key={it.id}>
                                    <td>{it.symbol}</td>
                                    <td>{new Date(it.added_at).toLocaleString()}</td>
                                    <td>
                                        <button onClick={() => handleGoToCompany(it.symbol)}>View</button>
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
