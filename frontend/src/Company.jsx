import "./Company.css";
import React, { useContext, useEffect, useState } from "react";
import TradingView from "./component/TradingView";
import PriceHistory from "./component/PriceHistory";
import CompanyInfo from "./component/CompanyInfo";
import Announcement from "./component/Announcement";
import { AuthContext } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "./component/Navbar";

export default function Company() {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    // Tab state: "info" or "announcement"
    const [activeTab, setActiveTab] = useState("info");

    useEffect(() => {
        if (!user) {
            navigate("/login");
        }
    }, [user, navigate]);

    if (!user) return null;

    return (
        <>
            <Navbar />
            <CompanyInfo />
            {/* Tab Navigation */}
            <div className="company-tab-nav">
                <button
                    className={activeTab === "info" ? "active-tab" : ""}
                    onClick={() => setActiveTab("info")}
                >
                    Info
                </button>
                <button
                    className={activeTab === "announcement" ? "active-tab" : ""}
                    onClick={() => setActiveTab("announcement")}
                >
                    Announcements
                </button>
            </div>

            {/* Tab Content */}
            <div className="company-tab-content">
                {activeTab === "info" && (
                    <>
                        <TradingView />
                        <PriceHistory />
                    </>
                )}
                {activeTab === "announcement" && (
                    <Announcement />
                )}
            </div>
        </>
    );
}
