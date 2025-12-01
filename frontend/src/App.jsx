import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Signup from "./Signup";
import Login from "./Login";
import Dashboard from "./Dashboard";
import { AuthProvider } from "./AuthContext";
import Company from "./Company";
import WatchlistPage from "./WatchlistPage";
import AllCompany from "./AllCompany";
import Landing from "./Landing";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import { AdminAuthProvider } from "./AdminAuthContext";


function App() {
  return (
    <AdminAuthProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/company/:symbol" element={<Company />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/allcompany" element={<AllCompany />} />
          </Routes>
        </Router>
      </AuthProvider>
    </AdminAuthProvider>
  );
}

export default App;
