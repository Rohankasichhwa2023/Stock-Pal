import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import "./Login.css";
import { Link } from "react-router-dom";
import bgImage from "./wallpaper.jpg";
import logo from "./logo.png"

const Login = () => {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: "", password: "" });
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            const response = await axios.post("http://127.0.0.1:8000/users/login/", formData);
            const { user, tokens } = response.data;
            login(user, tokens.access);
            navigate("/dashboard");
        } catch (error) {
            setError(error.response?.data?.detail || "Invalid credentials");
        }
    };

    return (
        <div
            className="login-container"
            style={{ backgroundImage: `url(${bgImage})` }}
        >
            <div className="login-overlay" />
            <div className="login-box" role="main" aria-labelledby="login-heading">
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

                <h2 id="login-heading">Login</h2>
                {error && <p className="error-text" role="alert">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="username">Username</label>
                        <input id="username" name="username" type="text" value={formData.username} onChange={handleChange} required />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required />
                    </div>
                    <button type="submit" className="login-btn">Login</button>
                    <div style={{ marginTop: "14px", fontSize: "14px", textAlign: "center" }}>
                        <span>Don't have an account? </span>
                        <Link to="/signup" style={{ color: "#007bff", textDecoration: "none", fontWeight: "500" }}>
                            Sign up
                        </Link>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default Login;
