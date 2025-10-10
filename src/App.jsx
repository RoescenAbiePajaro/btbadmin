import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import HomePage from "./components/HomePage";
import AdminPage from "./components/AdminLogin";
import AdminRegistration from "./components/AdminRegistration";
import AdminDashboard from "./components/AdminDashboard";

// Wrapper so we can use useNavigate inside
function AdminDashboardWrapper() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState({ username: "Admin" });

  // Redirect if not logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/"); // go to HomePage if no token
    }
  }, [navigate]);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userData");
    navigate("/"); // redirect to HomePage
  };

  return <AdminDashboard onLogout={handleLogout} userData={userData} />;
}

export default function App() {
  const [showLogin, setShowLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [userData, setUserData] = useState(null);

  const handleLogin = (userType, username) => {
    setUserData({ userType, username });
    localStorage.setItem("userData", JSON.stringify({ userType, username }));
    setLoading(true);
  };

  const handleLoadingComplete = () => {
    setLoading(false);
    setShowLogin(false);
  };

  // Optional: your loading screen logic (if you have one)
  if (loading) {
    return (
      <LoadingScreen
        progress={loadingProgress}
        setProgress={setLoadingProgress}
        onComplete={handleLoadingComplete}
      />
    );
  }

  return (
    <Router>
      <Routes>
        {/* HomePage */}
        <Route path="/" element={<HomePage onLogin={handleLogin} />} />

        {/* Admin Login & Registration */}
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin-registration" element={<AdminRegistration />} />

        {/* Admin Dashboard with logout redirection */}
        <Route path="/admin-dashboard" element={<AdminDashboardWrapper />} />
      </Routes>
    </Router>
  );
}
