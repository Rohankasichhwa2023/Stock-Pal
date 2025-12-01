// AdminLogin.jsx
import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AdminAuthContext } from "./AdminAuthContext";

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
                // tokens.access is your JWT access token
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
        <div style={{ maxWidth: 420, margin: "40px auto" }}>
            <h2>Admin Login</h2>
            <form onSubmit={handleLogin}>
                <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="submit">Login</button>
            </form>
            {message && <p style={{ color: "red" }}>{message}</p>}
        </div>
    );
};

export default AdminLogin;
