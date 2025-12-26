import React, { useEffect, useState } from "react";
import "./DashBoardAdmin.css";

const Modal = ({ open, title, items, onClose }) => {
    if (!open) return null;
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    {items.length === 0 ? (
                        <p>No companies to show.</p>
                    ) : (
                        <ul className="company-list">
                            {items.map((c, idx) => (
                                <li key={c.symbol || idx} className="company-item">
                                    <img
                                        className="company-logo"
                                        src={`http://127.0.0.1:8000/${c.logo}`}
                                        alt={`logo-${c.symbol}`}
                                        onError={(e) => (e.currentTarget.style.display = "none")}
                                    />
                                    <div className="company-meta">
                                        <div className="company-name">{c.name || "—"}</div>
                                        <div className="company-symbol">{c.symbol}</div>
                                        <div className="company-sector">{c.sector || "—"}</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalItems, setModalItems] = useState([]);
    const [modalTitle, setModalTitle] = useState("");

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("http://127.0.0.1:8000/api/admin/dashboard-stats/", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
                    },
                });
                if (!res.ok) {
                    throw new Error(`Error fetching data: ${res.status}`);
                }
                const data = await res.json();
                setStats(data);
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const openModalFor = (type) => {
        if (!stats) return;
        if (type === "trained") {
            setModalTitle(`Trained Companies (${stats.trained_companies})`);
            setModalItems(stats.trained_companies_list || []);
        } else {
            setModalTitle(`Left To Train (${stats.to_train})`);
            setModalItems(stats.to_train_companies_list || []);
        }
        setModalOpen(true);
    };

    if (loading) return <p>Loading dashboard...</p>;
    if (error) return <p>Error: {error}</p>;
    if (!stats) return <p>No data available</p>;

    return (
        <div className="dashboard-container">
            <h2>Dashboard</h2>
            <div className="dashboard-cards">
                <div className="card">
                    <h3>Total Companies</h3>
                    <p>{stats.total_companies}</p>
                </div>

                <div className="card clickable" onClick={() => openModalFor("trained")}>
                    <h3>Trained Companies</h3>
                    <p>{stats.trained_companies}</p>
                    <small>Click to view list</small>
                </div>

                <div className="card clickable" onClick={() => openModalFor("to_train")}>
                    <h3>Left To Train</h3>
                    <p>{stats.to_train}</p>
                    <small>Click to view list</small>
                </div>

                <div className="card">
                    <h3>Model Min Accuracy</h3>
                    <p>{stats.min_accuracy !== null ? `${stats.min_accuracy_symbol}` : "N/A"}</p>
                    <p>{stats.min_accuracy !== null ? `${stats.min_accuracy}%` : "N/A"}</p>

                </div>

                <div className="card">
                    <h3>Model Max Accuracy</h3>
                    <p>{stats.min_accuracy !== null ? `${stats.max_accuracy_symbol}` : "N/A"}</p>
                    <p>{stats.max_accuracy !== null ? `${stats.max_accuracy}%` : "N/A"}</p>

                </div>
            </div>

            <Modal
                open={modalOpen}
                title={modalTitle}
                items={modalItems}
                onClose={() => setModalOpen(false)}
            />
        </div>
    );
};

export default Dashboard;
