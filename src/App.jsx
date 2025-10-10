import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./components/HomePage";
import LoadingScreen from "./components/LoadingScreen";
import CanvasApp from "./components/CanvasApp";
import AdminPage from "./components/AdminLogin";
import AdminRegistration from "./components/AdminRegistration";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  const [showLogin, setShowLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [userData, setUserData] = useState({ userType: "", username: "" });

  const handleLogin = (userType, username) => {
    setUserData({ userType, username });
    setLoading(true);
  };

  const handleLoadingComplete = () => {
    setLoading(false);
    setShowLogin(false);
  };

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
        <Route 
          path="/" 
          element={
            showLogin ? (
              <HomePage onLogin={handleLogin} />
            ) : (
              <CanvasApp userData={userData} />
            )
          } 
        />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin-registration" element={<AdminRegistration />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}