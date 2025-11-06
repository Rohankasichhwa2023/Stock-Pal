import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";
import logo from "../logo.png"

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const [query, setQuery] = useState("");
    const [companies, setCompanies] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        fetch("http://127.0.0.1:8000/api/companies/")
            .then((res) => res.json())
            .then((data) => setCompanies(data))
            .catch((err) => console.error("Error loading companies:", err));
    }, []);

    const handleSearch = (e) => {
        const val = e.target.value.toUpperCase();
        setQuery(val);
        if (val.trim() === "") {
            setFiltered([]);
            setShowDropdown(false);
        } else {
            const results = companies
                .filter((c) => c.symbol.toUpperCase().includes(val))
                .slice(0, 10);
            setFiltered(results);
            setShowDropdown(true);
        }
    };

    const handleSelect = (symbol) => {
        if (!symbol) return;
        navigate(`/company/${symbol}`);
        setQuery("");
        setFiltered([]);
        setShowDropdown(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && query.trim() !== "") {
            const match = companies.find(
                (c) => c.symbol === query.trim().toUpperCase()
            );
            if (match) handleSelect(match.symbol);
        }
    };

    const handleClear = () => {
        setQuery("");
        setFiltered([]);
        setShowDropdown(false);
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const goHome = () => navigate("/dashboard");
    const goWatchlist = () => navigate("/watchlist");
    const goAllCompany = () => navigate("/allcompany")

    const isActive = (path) => location.pathname === path;

    if (!user) {
        navigate("/login");
        return null;
    }

    return (
        <div className="navbar-container">
            <div className="navbar">
                <div className="nav-left">
                    <img
                        src={logo}
                        className="nav-title"
                        alt="App Logo"
                        onClick={goHome}
                        style={{
                            width: "100px",
                            height: "50px",
                            objectFit: "cover",
                            display: "block",
                            margin: "0 auto 6px auto"
                        }} />
                </div>

                <div className="nav-center">
                    <div className="search-container">
                        <div className="search-box">
                            <input
                                type="text"
                                value={query}
                                onChange={handleSearch}
                                onKeyDown={handleKeyDown}
                                placeholder="Search company symbol (e.g. NABIL, ADBL)..."
                            />
                            {query && (
                                <span className="clear-icon" onClick={handleClear}>
                                    ×
                                </span>
                            )}
                        </div>

                        {showDropdown && filtered.length > 0 && (
                            <ul className="dropdown">
                                {filtered.map((c) => (
                                    <li
                                        key={c.symbol}
                                        onClick={() => handleSelect(c.symbol)}
                                    >
                                        {c.symbol} — {c.full_name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="nav-right">
                    <div className="user-dropdown-container">
                        <button
                            className="user-btn"
                            onClick={() => setShowDropdown((prev) => !prev)}
                        >
                            {user.username} ▼
                        </button>
                        {showDropdown && (
                            <div className="user-dropdown">
                                <button onClick={handleLogout}>Logout</button>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <div className="nav-links">
                <button
                    onClick={goHome}
                    className={isActive("/dashboard") ? "active" : ""}
                >
                    Home
                </button>
                <button
                    onClick={goWatchlist}
                    className={isActive("/watchlist") ? "active" : ""}
                >
                    Watchlist
                </button>
                <button
                    onClick={goAllCompany}
                    className={isActive("/allcompany") ? "active" : ""}
                >
                    Companies
                </button>
            </div>
        </div>
    );
};

export default Navbar;
