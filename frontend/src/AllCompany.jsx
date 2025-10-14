import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AllCompany.css";
import Navbar from "./component/Navbar";
import { useNavigate } from "react-router-dom";

export default function AllCompany() {
    const [companies, setCompanies] = useState([]);
    const [sectors, setSectors] = useState([]);
    const [selectedSector, setSelectedSector] = useState("All");
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        axios
            .get("http://127.0.0.1:8000/api/companies/")
            .then((res) => {
                const data = res.data;
                setCompanies(data);
                const uniqueSectors = [
                    "All",
                    ...Array.from(new Set(data.map((item) => item.sector))),
                ];
                setSectors(uniqueSectors);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching companies:", err);
                setLoading(false);
            });
    }, []);

    const filteredCompanies =
        selectedSector === "All"
            ? companies
            : companies.filter((c) => c.sector === selectedSector);

    const handleGoToCompany = (symbol) => {
        navigate(`/company/${symbol}`);
    };

    return (
        <>
            <Navbar />
            <div className="all-company-container">
                <h1>All Listed Companies</h1>

                {/* Filter Section */}
                <div className="filter-container">
                    <label htmlFor="sector-select">Filter by Sector:</label>
                    <select
                        id="sector-select"
                        value={selectedSector}
                        onChange={(e) => setSelectedSector(e.target.value)}
                    >
                        {sectors.map((sector) => (
                            <option key={sector} value={sector}>
                                {sector}
                            </option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <p className="loading">Loading companies...</p>
                ) : (
                    <div className="company-grid">
                        {filteredCompanies.map((company) => (
                            <div onClick={() => handleGoToCompany(company.symbol)} key={company.symbol} className="company-card">
                                <img
                                    src={`http://127.0.0.1:8000/${company.logo}`}
                                    alt={company.symbol}
                                    className="company-logo"
                                    onError={(e) => {
                                        e.target.src =
                                            "https://via.placeholder.com/60x60?text=No+Logo";
                                    }}
                                />
                                <div className="company-info">
                                    <h3>{company.symbol}</h3>
                                    <p>{company.full_name}</p>
                                    <span className="sector">{company.sector}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
