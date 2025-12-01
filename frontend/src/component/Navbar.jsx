import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";
import logo from "../logo.png"

const Navbar = () => {
    // Assuming AuthContext provides user and logout function
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const [query, setQuery] = useState("");
    const [companies, setCompanies] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false); // State for user dropdown

    // Fetch company data on component mount
    useEffect(() => {
        // NOTE: Ensure your backend is running at http://127.0.0.1:8000
        fetch("http://127.0.0.1:8000/api/companies/")
            .then((res) => res.json())
            .then((data) => setCompanies(data))
            .catch((err) => console.error("Error loading companies:", err));
    }, []);

    // Handles changes in the search input
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

    // Navigates to the selected company page
    const handleSelect = (symbol) => {
        if (!symbol) return;
        navigate(`/company/${symbol}`);
        setQuery("");
        setFiltered([]);
        setShowDropdown(false);
    };

    // Handles 'Enter' key press in the search box
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && query.trim() !== "") {
            const match = companies.find(
                (c) => c.symbol === query.trim().toUpperCase()
            );
            // If an exact match is found, navigate to its page
            if (match) handleSelect(match.symbol);
        }
    };

    // Clears the search input and dropdown
    const handleClear = () => {
        setQuery("");
        setFiltered([]);
        setShowDropdown(false);
    };

    // Handles user logout
    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    // Navigation handlers for bottom links
    const goHome = () => navigate("/dashboard");
    const goWatchlist = () => navigate("/watchlist");
    const goAllCompany = () => navigate("/allcompany")

    // Checks if the current path matches the link path for active styling
    const isActive = (path) => location.pathname === path;

    // Authentication check: redirect to login if no user is found
    if (!user) {
        // NOTE: This logic assumes your AuthContext manages user state properly.
        navigate("/login");
        return null;
    }

    return (
        <div className="navbar-container">
            <div className="navbar">
                <div className="nav-left">
                    {/* Logo/Home link */}
                    <img
                        src={logo}
                        className="nav-logo"
                        alt="App Logo"
                        onClick={goHome}
                    />
                </div>

                {/* Center Search Bar */}
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

                        {/* Search Dropdown Results */}
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

                {/* Right User Dropdown */}
                <div className="nav-right">
                    <div className="user-dropdown-container">
                        <button
                            className="user-btn"
                            onClick={() => setShowUserDropdown((prev) => !prev)} // Use the dedicated state
                        >
                            {user.username} ▼
                        </button>
                        {showUserDropdown && ( // Use the dedicated state
                            <div className="user-dropdown">
                                <button onClick={handleLogout}>Logout</button>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Bottom Navigation Links */}
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