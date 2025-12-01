// AdminAuthContext.jsx
import React, { createContext, useState } from "react";

export const AdminAuthContext = createContext();

export const AdminAuthProvider = ({ children }) => {
    const [adminUser, setAdminUser] = useState(
        JSON.parse(localStorage.getItem("adminUser")) || null
    );
    const [accessToken, setAccessToken] = useState(localStorage.getItem("adminAccessToken") || null);

    const setAuth = (user, token) => {
        setAdminUser(user);
        setAccessToken(token);
        localStorage.setItem("adminUser", JSON.stringify(user));
        localStorage.setItem("adminAccessToken", token);
    };

    const clearAuth = () => {
        setAdminUser(null);
        setAccessToken(null);
        localStorage.removeItem("adminUser");
        localStorage.removeItem("adminAccessToken");
    };

    return (
        <AdminAuthContext.Provider value={{ adminUser, accessToken, setAuth, clearAuth }}>
            {children}
        </AdminAuthContext.Provider>
    );
};
