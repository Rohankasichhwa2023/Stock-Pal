import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Signup from "./Signup";
import Login from "./Login";
import Dashboard from "./Dashboard";
import { AuthProvider } from "./AuthContext";
import Company from "./Company";
import NepseData from "./Nepse";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/company/:symbol" element={<Company />} />
          <Route path="/nepse" element={<NepseData />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
