import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./CompanyInfo.css";
import WatchlistButton from "./WatchlistButton";

const CompanyInfo = () => {
    const { symbol } = useParams(); // get symbol from route param
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCompany = async () => {
            try {
                const response = await axios.get(`http://127.0.0.1:8000/api/info/${symbol}/`);
                setCompany(response.data);
            } catch (error) {
                console.error("Error fetching company info:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCompany();
    }, [symbol]);

    if (loading) return <p className="loading-text">Loading company info...</p>;

    if (!company) return <p className="loading-text">Company not found.</p>;

    return (
        <div className="company-info-page">
            <div className="company-card detailed">
                <div className="logo-container large">
                    <img
                        src={`http://127.0.0.1:8000/${company.logo}`}
                        alt={company.symbol}
                        className="company-logo"
                        onError={(e) => (e.target.style.display = "none")}
                    />
                </div>
                <div className="company-details">
                    <h2 className="company-symbol">{company.symbol}</h2>
                    <h3 className="company-name">{company.full_name}</h3>
                    <p className="company-sector">Sector: {company.sector}</p>
                </div>
                <WatchlistButton symbol={company.symbol} />
            </div>
        </div>
    );
};

export default CompanyInfo;
