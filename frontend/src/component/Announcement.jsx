import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./Announcement.css";

const Announcement = () => {
    const { symbol } = useParams();
    const [announcements, setAnnouncements] = useState(null);
    const [page, setPage] = useState(1);
    const perPage = 10;

    useEffect(() => {
        setAnnouncements(null);
        axios.get(`http://127.0.0.1:8000/api/announcement/${symbol}/`)
            .then(res => {
                if (Array.isArray(res.data)) {
                    setAnnouncements(res.data);
                } else if (typeof res.data === "string") {
                    try {
                        const parsed = JSON.parse(res.data);
                        setAnnouncements(Array.isArray(parsed) ? parsed : [parsed]);
                    } catch {
                        setAnnouncements([]);
                    }
                } else {
                    setAnnouncements([]);
                }
                setPage(1);
            })
            .catch(err => {
                console.error("Announcement fetch error:", err);
                setAnnouncements([]);
            });
    }, [symbol]);

    const dataArr = Array.isArray(announcements) ? announcements : [];
    const totalPages = Math.max(1, Math.ceil(dataArr.length / perPage));
    const paginated = dataArr.slice((page - 1) * perPage, page * perPage);

    return (
        <div className="announcement-container">
            <h2>Announcements — {symbol?.toUpperCase()}</h2>

            <div className="table-wrapper">
                <table className="announcement-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Headline</th>
                        </tr>
                    </thead>
                    <tbody>
                        {announcements === null ? (
                            <tr><td colSpan="3" style={{ textAlign: "center" }}>Loading…</td></tr>
                        ) : paginated.length === 0 ? (
                            <tr><td colSpan="3" style={{ textAlign: "center" }}>No announcements found.</td></tr>
                        ) : (
                            paginated.map((row, i) => (
                                <tr key={i}>
                                    <td>{row.date || "-"}</td>
                                    <td>
                                        <a href={row.link} target="_blank" rel="noreferrer">
                                            {row.headline || "-"}
                                        </a>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="pagination">
                <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>‹ Previous</button>
                <span>Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}>Next ›</button>
            </div>
        </div>
    );
};

export default Announcement;
