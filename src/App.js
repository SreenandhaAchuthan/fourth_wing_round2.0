import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'aos/dist/aos.css';
import 'font-awesome/css/font-awesome.min.css';
import FossApp from './foss';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import SelectRole from './pages/SelectRole';
import MentorDashboard from './pages/MentorDashboard';
import OfficeDashboard from './pages/OfficeDashboard';
import Events from './pages/Events';
import EventRegistration from './pages/EventRegistration';
import ExamPage from './pages/ExamPage';
import Round2Manager from './pages/round2/Round2Manager';
import Leaderboard from './pages/round2/Leaderboard';
import Round1Exam from './pages/round1/Round1Exam';
import ProtectedRoute from './components/ProtectedRoute';
import CustomCursor from './components/CustomCursor';
import Loader from './components/Loader';
import NotFound from './components/NotFound';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  // Disable right-click globally
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Block developer tools shortcuts
    const handleKeyDown = (e) => {
      // F12 - Developer Tools
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+I - Inspect Element
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+J - Console
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+C - Inspect Element
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
      }

      // Ctrl+U - View Source
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }

      // Ctrl+S - Save Page
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <AuthProvider>
      <Router>
        {isLoading && <Loader onLoadingComplete={handleLoadingComplete} />}
        <CustomCursor />
        <Routes>
          <Route path="/" element={<FossApp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/select-role"
            element={
              <ProtectedRoute>
                <SelectRole />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mentor"
            element={
              <ProtectedRoute requireRole="mentor">
                <MentorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/office"
            element={
              <ProtectedRoute requireRole="office_bearer">
                <OfficeDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventRegistration />} />
          <Route path="/exam" element={<ExamPage />} />
          <Route path="/round1" element={<Navigate to="/" replace />} />
          <Route path="/round2" element={<Round2Manager />} />
          <Route path="/round2/leaderboard" element={<Leaderboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
