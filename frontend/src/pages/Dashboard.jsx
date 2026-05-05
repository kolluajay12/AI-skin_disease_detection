import { useState, useEffect } from 'react';
import { 
  Activity, 
  Clock, 
  Camera, 
  History, 
  Eye, 
  ChevronRight,
  Plus
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = ({ user }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:8000/api/predict/history', {
          headers: { 'x-auth-token': token }
        });
        setHistory(res.data);
      } catch (err) {
        console.error('Failed to fetch dashboard history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const totalScans = history.length;
  const uniqueDays = new Set(history.map(item => new Date(item.createdAt).toDateString())).size;
  const lastLoginDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        
        {/* STATS SECTION */}
        <div className="stats-grid">
          <div className="stat-card">
            <h2 className="stat-value">{totalScans}</h2>
            <p className="stat-label">Total Scans</p>
          </div>
          <div className="stat-card">
            <h2 className="stat-value">{uniqueDays}</h2>
            <p className="stat-label">Days Active</p>
          </div>
          <div className="stat-card">
            <h2 className="stat-value">{lastLoginDate}</h2>
            <p className="stat-label">Last Login</p>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="section-header-block">
           <h2 className="section-main-title">Quick Actions</h2>
        </div>
        <div className="quick-actions-grid">
          <Link to="/analyze" className="action-card action-new">
            <div className="action-icon-circle bg-blue">
              <Camera size={24} />
            </div>
            <div className="action-info">
              <h3>New Analysis</h3>
              <p>Upload or capture a new image for analysis</p>
            </div>
            <ChevronRight className="action-arrow" />
          </Link>
          <Link to="/history" className="action-card action-history">
            <div className="action-icon-circle bg-green">
              <History size={24} />
            </div>
            <div className="action-info">
              <h3>View History</h3>
              <p>Review all your previous scans and results</p>
            </div>
            <ChevronRight className="action-arrow" />
          </Link>
        </div>

        {/* RECENT SCANS TABLE */}
        <div className="section-header-block">
           <h2 className="section-main-title">Recent Scans</h2>
        </div>
        
        <div className="recent-scans-wrapper">
           <table className="scans-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Condition</th>
                  <th>Confidence</th>
                  <th>Severity</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="table-loading">Loading...</td></tr>
                ) : history.length === 0 ? (
                  <tr><td colSpan="5" className="table-empty">No recent scans found.</td></tr>
                ) : (
                  history.slice(0, 5).map(scan => (
                    <tr key={scan._id}>
                      <td className="date-cell">
                        {new Date(scan.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </td>
                      <td className="condition-cell">{scan.diseaseName}</td>
                      <td>
                        <div className="table-confidence-bar">
                           <div className="conf-value-label">{scan.confidence}%</div>
                           <div className="conf-bar-track">
                              <div className="conf-bar-fill" style={{ width: `${scan.confidence}%` }}></div>
                           </div>
                        </div>
                      </td>
                      <td>
                        <span className={`severity-pill ${scan.severity?.toUpperCase() || 'LOW'}`}>
                          {scan.severity?.toUpperCase() || 'LOW'}
                        </span>
                      </td>
                      <td>
                        <button className="table-view-btn" onClick={() => navigate(`/prediction/${scan._id}`)}>
                          <Eye size={14} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
           </table>
        </div>

        <div className="view-all-container">
           <Link to="/history" className="view-all-btn">
             View All History <ChevronRight size={16} />
           </Link>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
