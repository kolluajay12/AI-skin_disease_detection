import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, LogIn, UserPlus, Microscope, ChevronDown, User } from 'lucide-react';
import './Navbar.css';

const Navbar = ({ user, logout }) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-pill">
          {/* LOGO */}
          <Link to="/" className="nav-logo">
            <div className="logo-icon-box">
              <Microscope size={20} strokeWidth={2.5} />
            </div>
            <span className="logo-brand">SkinAI</span>
          </Link>

          {/* LINKS */}
          <div className="nav-links">
            {user ? (
              <>
                <Link to="/dashboard" className="nav-item">Dashboard</Link>
                <Link to="/analyze" className="nav-item">Analyze</Link>
                <Link to="/history" className="nav-item">History</Link>

                <div className="nav-divider"></div>

                <div className="nav-user-dropdown-root">
                  <button
                    className="user-trigger"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                  >
                    <div className="user-avatar-small">
                      <User size={14} />
                    </div>
                    <ChevronDown size={14} className={`chevron ${dropdownOpen ? 'rotated' : ''}`} />
                  </button>

                  {dropdownOpen && (
                    <div className="nav-dropdown-menu">
                      <div className="dropdown-header">
                        <p className="user-name-text">{user.fullName || 'User'}</p>
                        <p className="user-email-text">{user.email}</p>
                      </div>
                      <div className="dropdown-divider"></div>
                      <Link to="/profile" className="dropdown-link" onClick={() => setDropdownOpen(false)}>
                        <User size={14} /> Profile
                      </Link>
                      <button onClick={handleLogout} className="dropdown-link logout-btn">
                        <LogOut size={14} /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-item">Sign In</Link>
                <Link to="/register" className="nav-register-pill">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
