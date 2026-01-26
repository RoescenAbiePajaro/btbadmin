// src/App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import HomePage from './components/HomePage';
import RoleSelection from './components/auth/RoleSelection';
import StudentRegistration from './components/auth/StudentRegistration';
import EducatorRegistration from './components/auth/EducatorRegistration';
import AdminRegistration from './components/auth/AdminRegistration';
import Login from './components/auth/Login';
import EducatorDashboard from './components/educator/EducatorDashboard';
import StudentDashboard from './components/student/StudentDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import EmailVerification from './components/auth/EmailVerification';
import Toast from './components/Toast';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  
  if (!token || !userData) {
    return <Navigate to="/login" replace />;
  }
  
  try {
    const user = JSON.parse(userData);
    
    // Check if user role is allowed
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
    
    return children;
  } catch (error) {
    console.error('Error parsing user data:', error);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }
};

// Public Only Route Component (for login/register pages when already logged in)
const PublicOnlyRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  
  if (token && userData) {
    try {
      const user = JSON.parse(userData);
      // Redirect to appropriate dashboard
      if (user.role === 'student') {
        return <Navigate to="/student/dashboard" replace />;
      } else if (user.role === 'educator') {
        return <Navigate to="/educator/dashboard" replace />;
      } else if (user.role === 'admin') {
        return <Navigate to="/admin/dashboard" replace />;
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  }
  
  return children;
};

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
};

function App() {
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  return (
    <Router>
      <ScrollToTop />
      
      {/* Toast Notification */}
      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}
      
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/select-role" element={<PublicOnlyRoute><RoleSelection /></PublicOnlyRoute>} />
        <Route path="/admin-register" element={<PublicOnlyRoute><AdminRegistration /></PublicOnlyRoute>} />
        
        {/* Registration Routes */}
        <Route path="/register/student" element={<PublicOnlyRoute><StudentRegistration /></PublicOnlyRoute>} />
        <Route path="/register/educator" element={<PublicOnlyRoute><EducatorRegistration /></PublicOnlyRoute>} />
        
        {/* Login Routes — no PublicOnlyRoute: landing on /login clears session (Back = expire) */}
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<EmailVerification />} />
        
        {/* Protected Routes - Student */}
        <Route 
          path="/student/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Protected Routes - Educator */}
        <Route 
          path="/educator/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['educator']}>
              <EducatorDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Protected Routes - Admin */}
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;