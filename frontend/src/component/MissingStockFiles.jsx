import React, { useEffect, useState } from "react";
import axios from "axios";

const MissingStockFiles = () => {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get(
                    "http://127.0.0.1:8000/api/admin/companies/companies_without_stock_files/"
                );
                if (res.data.success) {
                    setCompanies(res.data.companies_missing_files);
                } else {
                    setError(res.data.message || "Failed to load data");
                }
            } catch (err) {
                setError("Error fetching data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <p style={styles.loading}>Loading...</p>;
    if (error) return <p style={styles.error}>{error}</p>;
    if (companies.length === 0)
        return <p style={styles.empty}>All companies have stock files.</p>;

    return (
        <div style={styles.container}>
            <h2 style={styles.heading}>Pending Stock File Uploads</h2>

            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Logo</th>
                        <th style={styles.th}>Company Name</th>
                        <th style={styles.th}>Symbol</th>
                        <th style={styles.th}>Sector</th>
                    </tr>
                </thead>
                <tbody>
                    {companies.map((c, index) => (
                        <tr key={index} style={styles.tr}>
                            <td style={styles.td}>
                                <img
                                    src={`http://127.0.0.1:8000/${c.logo}`}
                                    alt={c.full_name}
                                    style={styles.logo}
                                />
                            </td>
                            <td style={styles.td}>{c.full_name}</td>
                            <td style={styles.td}>{c.symbol}</td>
                            <td style={styles.td}>{c.sector}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default MissingStockFiles;

const styles = {
    container: {
        maxWidth: "1000px",
        margin: "30px auto",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
    },
    heading: {
        fontSize: "24px",
        marginBottom: "20px",
        fontWeight: "600",
        textAlign: "center",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        background: "#fff",
        borderRadius: "10px",
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    },
    th: {
        background: "#f4f4f4",
        padding: "12px",
        fontSize: "14px",
        fontWeight: "600",
        borderBottom: "1px solid #ddd",
        textAlign: "left",
    },
    tr: {
        borderBottom: "1px solid #eee",
    },
    td: {
        padding: "12px",
        fontSize: "14px",
        verticalAlign: "middle",
    },
    logo: {
        width: "50px",
        height: "50px",
        borderRadius: "6px",
        objectFit: "contain",
        border: "1px solid #ddd",
        background: "#fafafa",
        padding: "4px",
    },
    loading: {
        textAlign: "center",
        marginTop: "40px",
        fontSize: "16px",
    },
    error: {
        textAlign: "center",
        color: "red",
        fontSize: "15px",
        marginTop: "20px",
    },
    empty: {
        textAlign: "center",
        marginTop: "25px",
        fontSize: "16px",
        color: "green",
        fontWeight: "500",
    },
};
