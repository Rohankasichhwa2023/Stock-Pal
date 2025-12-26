// AdminLogin.jsx
import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AdminAuthContext } from "./AdminAuthContext";
import "./AdminLogin.css";
import bgImage from "./wallpaper.jpg";
import logo from "./logo.png";

const AdminLogin = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const navigate = useNavigate();
    const { setAuth } = useContext(AdminAuthContext);

    const handleLogin = async (e) => {
        e.preventDefault();
        setMessage("");
        try {
            const res = await axios.post("http://127.0.0.1:8000/users/admin-login/", { username, password });

            if (res.data.success) {
                const { user, tokens } = res.data;
                setAuth(user, tokens.access);
                navigate("/admin-dashboard");
            } else {
                setMessage(res.data.message || "Login failed");
            }
        } catch (err) {
            setMessage(err.response?.data?.error || "Login error");
        }
    };

    return (
        <div
            className="adminlogin-container"
            style={{ backgroundImage: `url(${bgImage})` }}
        >
            <div className="adminlogin-overlay" />

            <div className="adminlogin-box">
                <img
                    src={logo}
                    alt="Admin Logo"
                    style={{
                        width: "150px",
                        height: "150px",
                        objectFit: "contain",
                        borderRadius: "50%",
                        display: "block",
                        margin: "0 auto 12px auto",
                    }}
                />

                <h2>Admin Login</h2>

                {message && <p className="error-text">{message}</p>}

                <form onSubmit={handleLogin}>
                    <div className="input-group">
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="login-btn">
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
