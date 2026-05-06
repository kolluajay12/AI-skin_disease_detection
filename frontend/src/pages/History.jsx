import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  History as HistoryIcon,
  Search,
  Folder,
  Camera,
  Info,
  Calendar,
  Clock,
  Settings,
  Trash2,
  Filter,
  ArrowUpDown,
  X
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import './History.css';


const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/predict/history`, {
          headers: { 'x-auth-token': token }
        });
        setHistory(res.data);
      } catch (err) {
        console.error('Failed to fetch history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this scan? This cannot be undone.')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8000/api/predict/${id}`, {
        headers: { 'x-auth-token': token }
      });

      // Update local state to remove the deleted item
      setHistory(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      console.error('Failed to delete scan');
      alert('Failed to delete scan. Please try again.');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSeverityFilter('all');
    setSortOrder('newest');
  };

  const hasActiveFilters = searchTerm || severityFilter !== 'all' || sortOrder !== 'newest';

  const userData = JSON.parse(localStorage.getItem('user'));

  // FILTER & SORT LOGIC
  const filteredHistory = history
    .filter(item =>
      item.diseaseName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(item =>
      severityFilter === 'all' ? true : item.severity === severityFilter
    )
    .sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortOrder === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortOrder === 'confidence') return b.confidence - a.confidence;
      return 0;
    });

  return (
    <div className="history-page">
      <div className="history-container">

        {/* HEADER */}
        <header className="history-header">
          <div className="history-header-icon">
            <HistoryIcon size={32} />
          </div>
          <div>
            <h1>Your Scan History</h1>
            <p>View and manage all your previous skin analyses</p>
          </div>
        </header>

        {/* SEARCH & FILTER BAR */}
        {!loading && history.length > 0 && (
          <motion.div
            className="search-filter-bar"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Search Input */}
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                id="history-search"
                type="text"
                placeholder="Search by disease name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button
                  className="search-clear-btn"
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Severity Filter */}
            <div className="filter-group">
              <Filter size={16} className="filter-icon" />
              <select
                id="severity-filter"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Severity</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="filter-group">
              <ArrowUpDown size={16} className="filter-icon" />
              <select
                id="sort-order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="filter-select"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="confidence">Highest Confidence</option>
              </select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <motion.button
                className="clear-filters-btn"
                onClick={clearFilters}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                title="Clear all filters"
              >
                <X size={14} />
                Clear
              </motion.button>
            )}

            {/* Results Count */}
            <div className="results-count">
              <span>{filteredHistory.length}</span> of {history.length} scans
            </div>
          </motion.div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="text-center py-20 text-teal-400">Loading your history...</div>
        ) : history.length === 0 ? (
          /* EMPTY STATE */
          <div className="empty-history">
            <div className="empty-icon">
              <Folder size={100} strokeWidth={1.5} />
            </div>
            <h2>No scan history yet</h2>
            <p>Start analyzing images to build your history</p>
            <Link to="/analyze" className="start-btn">
              <Camera size={20} />
              <span>Start First Analysis</span>
            </Link>
          </div>
        ) : filteredHistory.length === 0 ? (
          /* NO RESULTS STATE */
          <motion.div
            className="empty-history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="empty-icon">
              <Search size={80} strokeWidth={1.5} />
            </div>
            <h2>No matching results</h2>
            <p>Try adjusting your search or filters to find what you're looking for</p>
            <button onClick={clearFilters} className="start-btn">
              <X size={20} />
              <span>Clear All Filters</span>
            </button>
          </motion.div>
        ) : (
          /* RESULTS GRID */
          <div className="history-grid">
            <AnimatePresence>
              {filteredHistory.map((scan, i) => (
                <motion.div
                  key={scan._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  layout
                  className="history-card"
                >
                  <div className="card-img-wrapper">
                    <img
                      src={`http://localhost:8000/uploads/${userData._id}/${scan.imagePath}`}
                      alt={scan.diseaseName}
                    />
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">{scan.diseaseName}</h3>
                    <div className="card-meta">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} />
                        {new Date(scan.createdAt).toLocaleDateString()}
                      </span>
                      <span className={`severity-badge ${scan.severity}`}>
                        {scan.severity}
                      </span>
                    </div>

                    <div className="confidence-sec">
                      <div className="confidence-info">
                        <span>AI Confidence</span>
                        <strong>{scan.confidence}%</strong>
                      </div>
                      <div className="confidence-bar-bg">
                        <div
                          className="confidence-bar-fill"
                          style={{
                            width: `${scan.confidence}%`,
                            background: scan.confidence > 80 ? '#22c55e' : (scan.confidence > 50 ? '#f59e0b' : '#ef4444')
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="card-actions">
                      <Link to={`/prediction/${scan._id}`} className="view-btn">
                        <Info size={16} />
                        View Details
                      </Link>
                      <button
                        className="delete-history-btn"
                        onClick={() => handleDelete(scan._id)}
                        title="Delete Record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

      </div>

      {/* FLOATING SETTINGS */}
      <div className="floating-settings">
        <Settings size={22} />
      </div>

    </div>
  );
};

export default History;
