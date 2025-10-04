import React, { useContext } from "react";
import { AuthContext } from "./AuthContext";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext); // get user info and logout function
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();               // clear user state + localStorage
        navigate("/login");     // redirect to signup page
    };

    if (!user) {
        navigate("/login");
        return null;
    }

    return (
        <div style={{ maxWidth: "600px", margin: "50px auto", textAlign: "center" }}>
            <h1>Welcome, {user.username}!</h1>
            <p>Email: {user.email}</p>
            <button onClick={handleLogout}>
                Logout
            </button>
        </div>
    );
};

export default Dashboard;
