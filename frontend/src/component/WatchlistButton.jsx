import React, { useEffect, useState, useContext } from "react";
import api from "../api";
import { AuthContext } from "../AuthContext";
import "./WatchlistButton.css"

const WatchlistButton = ({ symbol }) => {
    const { accessToken } = useContext(AuthContext);
    const [added, setAdded] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        const controller = new AbortController(); // native fetch cancellation also works with axios via CancelToken if you prefer

        const check = async () => {
            // Use context token or fallback to localStorage (defensive)
            const token = accessToken || localStorage.getItem("accessToken");
            console.debug("WatchlistButton - token used:", !!token);

            if (!token) {
                // no token available right now — don't call the API
                setAdded(false);
                return;
            }

            try {
                const res = await api.get(`/watchlist/check/${symbol}/`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal, // safe; axios ignores signal in older versions — see note below
                });
                if (mounted) setAdded(!!res.data.added);
            } catch (err) {
                if (err.name === 'CanceledError' || err.name === 'AbortError') {
                    // request cancelled — ignore
                    return;
                }
                console.error("Watchlist check error", err);
                console.error("Error response:", err.response?.data);
                console.error("Error status:", err.response?.status);

                // Unauthorized -> token invalid or backend rejected it
                if (err.response?.status === 401) {
                    console.log("Token missing/expired/invalid for check");
                    // optional: force logout or refresh token flow
                }
            }
        };

        check();

        return () => {
            mounted = false;
            try { controller.abort(); } catch (e) { /* ignore */ }
        };
    }, [symbol, accessToken]);


    const handleAdd = async () => {
        if (!accessToken) {
            alert("Please login to use watchlist");
            return;
        }
        setLoading(true);
        try {
            const res = await api.post("http://127.0.0.1:8000/watchlist/add/", { symbol });
            if (res.status === 201 || (res.data && res.data.message === "Already in watchlist")) {
                setAdded(true);
            }
        } catch (err) {
            console.error("Add to watchlist error", err);
            if (err.response?.status === 401) {
                alert("Session expired. Please login again.");
            } else {
                alert("Failed to add to watchlist");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async () => {
        if (!accessToken) {
            alert("Please login to use watchlist");
            return;
        }
        setLoading(true);
        try {
            await api.delete(`http://127.0.0.1:8000/watchlist/remove/${symbol}/`);
            setAdded(false);
        } catch (err) {
            console.error("Remove from watchlist error", err);
            if (err.response?.status === 401) {
                alert("Session expired. Please login again.");
            } else {
                alert("Failed to remove from watchlist");
            }
        } finally {
            setLoading(false);
        }
    };

    // Don't show button if not logged in
    if (!accessToken) {
        return null;
    }

    return (
        <div className="watchlist-btn-container">
            {added ? (
                <button
                    className="watchlist-btn added"
                    onClick={handleRemove}
                    disabled={loading}
                >
                    {loading ? "Working..." : "Remove from Watchlist"}
                </button>
            ) : (
                <button
                    className="watchlist-btn not-added"
                    onClick={handleAdd}
                    disabled={loading}
                >
                    {loading ? "Working..." : "Add to Watchlist"}
                </button>
            )}
        </div>

    );
};

export default WatchlistButton;