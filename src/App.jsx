// src/App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import HomePage from './components/HomePage';
import RoleSelection from './components/auth/RoleSelection';
import StudentRegistration from './components/auth/StudentRegistration';
import EducatorRegistration from './components/auth/EducatorRegistration';
import Login from './components/auth/Login';
import EducatorDashboard from './components/educator/EducatorDashboard';
import StudentDashboard from './components/student/StudentDashboard';
import EmailVerification from './components/auth/EmailVerification';
import Toast from './components/Toast';
import NotFound from './components/NotFound';

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
        
        {/* Registration Routes */}
        <Route path="/register/student" element={<PublicOnlyRoute><StudentRegistration /></PublicOnlyRoute>} />
        <Route path="/register/educator" element={<PublicOnlyRoute><EducatorRegistration /></PublicOnlyRoute>} />
        
        {/* Login Routes */}
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
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
        
        {/* 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;