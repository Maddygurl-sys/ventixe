import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import EventsHub from './pages/EventsHub';
import EventDetail from './pages/EventDetail';
import OrganiserDashboard from './pages/OrganiserDashboard';
import UserDashboard from './pages/UserDashboard';
import OrganiserEventDetail from './pages/OrganiserEventDetail';
import CheckinPage from './pages/CheckinPage';
import LoginPage from './pages/LoginPage';

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setAuthChecked(true);
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={(u) => setUser(u)} />;
  }

  const isAdmin = user.role === 'admin';

  return (
    <Router>
      <Layout>
        <Routes>
          {/* Admin lands on dashboard first, user lands on Book Events hub */}
          <Route 
            path="/" 
            element={isAdmin ? <Navigate to="/organiser/dashboard" replace /> : <EventsHub />} 
          />
          <Route path="/events" element={<EventsHub />} />
          <Route path="/events/:id" element={<EventDetail />} />
          
          {/* Dashboards */}
          <Route 
            path="/organiser/dashboard" 
            element={isAdmin ? <OrganiserDashboard /> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/dashboard" 
            element={!isAdmin ? <UserDashboard /> : <Navigate to="/organiser/dashboard" replace />} 
          />
          
          {/* Scoped paths (authorized at component level) */}
          <Route 
            path="/organiser/events/:id" 
            element={<OrganiserEventDetail />} 
          />
          <Route 
            path="/checkin/:eventId" 
            element={<CheckinPage />} 
          />
          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
