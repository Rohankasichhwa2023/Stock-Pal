import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const [query, setQuery] = useState("");
    const [companies, setCompanies] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);

    // Fetch companies list once
    useEffect(() => {
        fetch("http://127.0.0.1:8000/api/companies/")
            .then((res) => res.json())
            .then((data) => setCompanies(data))
            .catch((err) => console.error("Error loading companies:", err));
    }, []);

    // Filter results as user types
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

    // Navigate to company page when selecting or pressing Enter
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

    // ✅ Clear input field and dropdown
    const handleClear = () => {
        setQuery("");
        setFiltered([]);
        setShowDropdown(false);
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    if (!user) {
        navigate("/login");
        return null;
    }

    return (
        <div style={{ maxWidth: "600px", margin: "50px auto", textAlign: "center" }}>
            <h1>Welcome, {user.username}!</h1>
            <p>Email: {user.email}</p>
            <button onClick={handleLogout}>Logout</button>

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
                            X
                        </span>
                    )}
                </div>

                {showDropdown && filtered.length > 0 && (
                    <ul className="dropdown">
                        {filtered.map((c) => (
                            <li key={c.symbol} onClick={() => handleSelect(c.symbol)}>
                                {c.symbol} — {c.full_name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default Navbar;
