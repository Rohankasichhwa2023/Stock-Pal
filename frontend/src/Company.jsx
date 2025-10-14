import "./Company.css";
import React, { useContext, useEffect } from "react";
import TradingView from "./component/TradingView";
import PriceHistory from "./component/PriceHistory";
import CompanyInfo from "./component/CompanyInfo";
import { AuthContext } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "./component/Navbar";

export default function Company() {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    useEffect(() => {
        if (!user) {
            navigate("/login");
        }
    }, [user, navigate]); // only run when user changes

    if (!user) return null; // prevent rendering before redirect

    return (
        <>
            <Navbar />
            <CompanyInfo />
            <TradingView />
            <PriceHistory />
        </>
    );
}
