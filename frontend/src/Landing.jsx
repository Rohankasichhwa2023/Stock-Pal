import React from "react";
import { Link } from "react-router-dom";
import "./Landing.css";
import bgImage from "./wallpaper.jpg";
import logo from "./logo.png";

const Landing = () => {
    return (
        <div className="landing-page" style={{ backgroundImage: `url(${bgImage})` }}>
            <div className="landing-overlay" />

            {/* Navbar */}
            <nav className="landing-navbar">
                <img src={logo} alt="App Logo" className="landing-logo" />
            </nav>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-text">
                    <h1>Welcome to <span style={{ color: "black" }}>StockPal</span></h1>
                    <p>Track stocks, analyze trends, and manage your watchlist, All in one place.</p>
                    <div className="hero-buttons">
                        <Link to="/signup" className="hero-btn primary">Get Started</Link>
                        <Link to="/login" className="hero-btn secondary">Login</Link>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="features-cards">
                    <div className="feature-card">
                        <h3>Stock Analysis</h3>
                        <p>See stock trends and detailed company analysis to make informed decisions.</p>
                    </div>
                    <div className="feature-card">
                        <h3>Watchlist</h3>
                        <p>Create and manage your personalized watchlist for quick access to your favorite stocks.</p>
                    </div>
                    <div className="feature-card">
                        <h3>Predictions</h3>
                        <p>Get tomorrow’s predicted stock movements and price trends based on advanced models.</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Landing;
