import React, { createContext, useState } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Store user info and JWT access token
    const [user, setUser] = useState(
        JSON.parse(localStorage.getItem("user")) || null
    );
    const [accessToken, setAccessToken] = useState(
        localStorage.getItem("accessToken") || null
    );

    // Login function: stores user info and access token
    const login = (userData, token) => {
        setUser(userData);
        setAccessToken(token); // corrected
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("accessToken", token); // store as accessToken
    };

    // Logout function: clears everything
    const logout = () => {
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
    };

    return (
        <AuthContext.Provider value={{ user, accessToken, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
