import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, User } from 'lucide-react';
import axios from 'axios';
import './Login.css';


const Login = ({ login }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, formData);
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.msg || 'Login failed.');
    } finally {
      setLoading(false);
    }

  };

  return (<div className="login-page">


    <div className="login-card">

      {/* ICON */}
      <div className="login-icon">
        <User size={32} />
      </div>

      <h2>Welcome Back</h2>
      <p className="subtitle">Login to your account</p>

      {error && (
        <div className="error-box">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
          />
        </div>

        <div className="remember">
          <input type="checkbox" />
          <span>Remember Me</span>
        </div>

        <button type="submit" disabled={loading} className="login-btn">
          {loading ? 'Authenticating...' : 'Log In'}
        </button>
      </form>

      <div className="signup">
        Don’t have an account?{' '}
        <Link to="/register">Sign up here</Link>
      </div>

    </div>

    <div className="login-footer">
      <p>For Educational Purposes Only</p>
    </div>

  </div>

  );
};

export default Login;
