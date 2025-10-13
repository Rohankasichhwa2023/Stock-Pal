import React, { useEffect, useState, useContext } from "react";
import api from "../api";
import { AuthContext } from "../AuthContext";

const WatchlistButton = ({ symbol }) => {
    const { token } = useContext(AuthContext);
    const [added, setAdded] = useState(false);
    const [loading, setLoading] = useState(false);

    // Check initial status
    useEffect(() => {
        let mounted = true;
        const check = async () => {
            if (!token) {
                setAdded(false);
                return;
            }
            try {
                const res = await api.get(`/watchlist/check/${symbol}/`);
                if (mounted) setAdded(!!res.data.added);
            } catch (err) {
                console.error("Watchlist check error", err);
            }
        };
        check();
        return () => (mounted = false);
    }, [symbol, token]);

    const handleAdd = async () => {
        if (!token) {
            alert("Please login to use watchlist");
            return;
        }
        setLoading(true);
        try {
            const res = await api.post("/watchlist/add/", { symbol });
            if (res.status === 201) {
                setAdded(true);
            } else if (res.data && res.data.message === "Already in watchlist") {
                setAdded(true);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to add to watchlist");
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async () => {
        if (!token) {
            alert("Please login to use watchlist");
            return;
        }
        setLoading(true);
        try {
            await api.delete(`/watchlist/remove/${symbol}/`);
            setAdded(false);
        } catch (err) {
            console.error(err);
            alert("Failed to remove from watchlist");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {added ? (
                <button onClick={handleRemove} disabled={loading}>
                    {loading ? "Working..." : "Remove from Watchlist"}
                </button>
            ) : (
                <button onClick={handleAdd} disabled={loading}>
                    {loading ? "Working..." : "Add to Watchlist"}
                </button>
            )}
        </div>
    );
};

export default WatchlistButton;
