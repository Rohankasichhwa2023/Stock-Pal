import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./Signup.css";
import bgImage from "./wallpaper.jpg";
import logo from "./logo.png";

const Signup = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
    });
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            await axios.post("http://127.0.0.1:8000/users/signup/", formData);
            alert("User created successfully!");
            setFormData({ username: "", email: "", password: "" });
            navigate("/login");
        } catch (error) {
            setError(error.response?.data?.detail || "Error creating user");
        }
    };

    return (
        <div className="signup-container" style={{ backgroundImage: `url(${bgImage})` }}>
            <div className="signup-overlay" />
            <div className="signup-box" role="main" aria-labelledby="signup-heading">
                <img
                    src={logo}
                    alt="App Logo"
                    style={{
                        width: "150px",
                        height: "150px",
                        objectFit: "contain",
                        borderRadius: "50%",
                        display: "block",
                        margin: "0 auto 12px auto"
                    }}
                />
                <h2 id="signup-heading">Sign Up</h2>
                {error && <p className="error-text" role="alert">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <button type="submit" className="signup-btn">Sign Up</button>
                    <div style={{ marginTop: "14px", fontSize: "14px", textAlign: "center" }}>
                        <span>Already have an account? </span>
                        <Link to="/login" style={{ color: "#007bff", textDecoration: "none", fontWeight: "500" }}>
                            Login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Signup;
