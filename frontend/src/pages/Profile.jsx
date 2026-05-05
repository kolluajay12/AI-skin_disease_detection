import { useState, useEffect } from 'react';
import { 
  User, 
  Edit, 
  Key, 
  Activity, 
  Calendar, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Info,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import './Profile.css';

const Profile = ({ user, updateUser }) => {
  const [stats, setStats] = useState({ totalScans: 0, daysActive: 0 });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // MODAL STATES
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // FORM STATES
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dob: user?.dob || '',
    gender: user?.gender || ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:8000/api/predict/history', {
          headers: { 'x-auth-token': token }
        });
        
        const uniqueDays = new Set(res.data.map(item => new Date(item.createdAt).toDateString())).size;
        
        setStats({ 
          totalScans: res.data.length,
          daysActive: uniqueDays
        });
      } catch (err) {
        console.error('Error fetching profile stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setMsg({ type: 'loading', text: 'Updating profile...' });
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put('http://localhost:8000/api/auth/profile', profileForm, {
        headers: { 'x-auth-token': token }
      });
      updateUser(res.data);
      setMsg({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => { setShowEditModal(false); setMsg({ type: '', text: '' }); }, 1500);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.msg || 'Update failed' });
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return setMsg({ type: 'error', text: 'Passwords do not match' });
    }
    
    setMsg({ type: 'loading', text: 'Updating password...' });
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:8000/api/auth/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      }, {
        headers: { 'x-auth-token': token }
      });
      setMsg({ type: 'success', text: 'Password updated successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => { setShowPasswordModal(false); setMsg({ type: '', text: '' }); }, 1500);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.msg || 'Failed to update password' });
    }
  };

  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Apr 2026';
  const lastLogin = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="profile-page">
      <div className="profile-container">
        
        {/* LEFT COLUMN */}
        <div className="profile-sidebar">
          <div className="profile-card user-main-card">
            <div className="avatar-wrapper">
               <div className="profile-avatar">
                 <User size={64} />
               </div>
            </div>
            <h2 className="profile-name">{user?.fullName || 'User'}</h2>
            
            <button className="edit-profile-btn" onClick={() => setShowEditModal(true)}>
              <Edit size={16} />
              <span>Edit Profile</span>
            </button>
            
            <button className="change-password-link" onClick={() => setShowPasswordModal(true)}>
              <Key size={14} />
              <span>Change Password</span>
            </button>
          </div>

          <div className="profile-card stats-card">
            <h3>Account Stats</h3>
            <div className="stat-item">
              <span>Total Scans</span>
              <strong>{stats.totalScans}</strong>
            </div>
            <div className="stat-item">
              <span>Member Since</span>
              <strong>{memberSince}</strong>
            </div>
            <div className="stat-item">
              <span>Last Login</span>
              <strong>{lastLogin}</strong>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="profile-content">
          <div className="profile-card info-section">
            <div className="section-header">
              <Info size={18} />
              <h3>Profile Information</h3>
            </div>

            <div className="info-grid">

              <div className="info-item">
                <label>Email</label>
                <p>{user?.email}</p>
              </div>
              <div className="info-item">
                <label>Full Name</label>
                <p>{user?.fullName || 'Not provided'}</p>
              </div>
              <div className="info-item">
                <label>Phone Number</label>
                <p className="not-set">{user?.phone || 'Not set'}</p>
              </div>
              <div className="info-item">
                <label>Date of Birth</label>
                <p className="not-set">{user?.dob || 'Not set'}</p>
              </div>
              <div className="info-item">
                <label>Gender</label>
                <p className="not-set">{user?.gender || 'Not set'}</p>
              </div>
            </div>

            <div className="info-box">
               <Info size={16} />
               <span>Keep your profile up to date for better analysis tracking!</span>
            </div>
          </div>

          <div className="profile-card activity-section">
            <div className="section-header activity-header">
              <Activity size={18} />
              <h3>Activity Overview</h3>
            </div>
            <div className="activity-container">
              <div className="activity-stats-grid">
                <div className="activity-stat-card">
                   <div className="act-icon icon-blue"><Activity size={24} /></div>
                   <div className="act-value">{stats.totalScans}</div>
                   <div className="act-label">Total Scans</div>
                </div>
                <div className="activity-stat-card">
                   <div className="act-icon icon-green"><Calendar size={24} /></div>
                   <div className="act-value">{stats.daysActive}</div>
                   <div className="act-label">Days Active</div>
                </div>
                <div className="activity-stat-card">
                   <div className="act-icon icon-cyan"><ShieldCheck size={24} /></div>
                   <div className="act-value">0</div>
                   <div className="act-label">Doctor Visits</div>
                </div>
              </div>
              <div className="activity-divider"></div>
              <div className="recent-activity-section">
                <h4>Recent Activity</h4>
                <p className="no-activity">No activity yet</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Profile</h3>
              <button className="close-modal" onClick={() => setShowEditModal(false)}><X /></button>
            </div>
            <form onSubmit={handleProfileUpdate}>
               <div className="form-group">
                 <label>Full Name</label>
                 <input 
                   type="text" 
                   value={profileForm.fullName} 
                   onChange={(e) => setProfileForm({...profileForm, fullName: e.target.value})} 
                   required
                 />
               </div>
               <div className="form-group">
                 <label>Email</label>
                 <input 
                   type="email" 
                   value={profileForm.email} 
                   onChange={(e) => setProfileForm({...profileForm, email: e.target.value})} 
                   required
                 />
               </div>

               <div className="form-group-row">
                  <div className="form-group flex-1">
                    <label>Phone Number</label>
                    <input 
                      type="text" 
                      placeholder="+1 234 567 890"
                      value={profileForm.phone} 
                      onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})} 
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Date of Birth</label>
                    <input 
                      type="date" 
                      value={profileForm.dob} 
                      onChange={(e) => setProfileForm({...profileForm, dob: e.target.value})} 
                    />
                  </div>
               </div>
               <div className="form-group">
                 <label>Gender</label>
                 <select 
                    value={profileForm.gender} 
                    onChange={(e) => setProfileForm({...profileForm, gender: e.target.value})}
                    className="modal-select"
                 >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                 </select>
               </div>

               {msg.text && (
                 <div className={`modal-msg ${msg.type}`}>
                   {msg.type === 'success' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
                   {msg.text}
                 </div>
               )}

               <button type="submit" className="modal-btn" disabled={msg.type === 'loading'}>
                 {msg.type === 'loading' ? 'Saving...' : 'Save Changes'}
               </button>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="close-modal" onClick={() => setShowPasswordModal(false)}><X /></button>
            </div>
            <form onSubmit={handlePasswordUpdate}>
               <div className="form-group">
                 <label>Current Password</label>
                 <input 
                    type="password" 
                    required 
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                 />
               </div>
               <div className="form-group">
                 <label>New Password</label>
                 <input 
                    type="password" 
                    required 
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                 />
               </div>
               <div className="form-group">
                 <label>Confirm New Password</label>
                 <input 
                    type="password" 
                    required 
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                 />
               </div>

               {msg.text && (
                 <div className={`modal-msg ${msg.type}`}>
                   {msg.type === 'success' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
                   {msg.text}
                 </div>
               )}

               <button type="submit" className="modal-btn" disabled={msg.type === 'loading'}>
                 {msg.type === 'loading' ? 'Updating...' : 'Update Password'}
               </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;
