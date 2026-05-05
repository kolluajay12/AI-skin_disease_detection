import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AlertCircle, Info, Activity } from 'lucide-react';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Analyze from './pages/Analyze';
import History from './pages/History';
import PredictionDetail from './pages/PredictionDetail';
import Profile from './pages/Profile';
import axios from 'axios';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('http://localhost:8000/api/auth/user', {
        headers: { 'x-auth-token': token }
      }).then(res => {
        setUser(res.data);
      }).catch(() => {
        logout();
      }).finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const updateUser = (userData) => {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const newUser = { ...currentUser, ...userData };
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#1a2b33] text-teal-400 font-black tracking-widest uppercase text-xs animate-pulse">Initializing...</div>;

  return (
    <Router>
      <div className="min-h-screen">
        <Navbar user={user} logout={logout} />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={!user ? <Landing /> : <Navigate to="/dashboard" />} />
            <Route path="/login" element={!user ? <Login login={login} /> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!user ? <Register login={login} /> : <Navigate to="/dashboard" />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
            <Route path="/analyze" element={user ? <Analyze /> : <Navigate to="/login" />} />
            <Route path="/history" element={user ? <History /> : <Navigate to="/login" />} />
            <Route path="/prediction/:id" element={user ? <PredictionDetail /> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <Profile user={user} updateUser={updateUser} /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
