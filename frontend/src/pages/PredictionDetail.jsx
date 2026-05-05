import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ShieldCheck, 
  AlertCircle, 
  Info, 
  Activity, 
  Clock, 
  Plus, 
  Settings 
} from 'lucide-react';
import axios from 'axios';
import './Analyze.css'; // Reusing Analyze.css for consistent result styling

const PredictionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:8000/api/predict/${id}`, {
          headers: { 'x-auth-token': token }
        });
        setPrediction(res.data);
      } catch (err) {
        setError('Failed to load report results.');
      } finally {
        setLoading(false);
      }
    };
    fetchPrediction();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-teal-400">Loading Report...</div>;
  
  if (error || !prediction) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] p-4 text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">{error || 'Prediction not found'}</h2>
        <button onClick={() => navigate('/history')} className="text-teal-400 hover:underline">Back to History</button>
      </div>
    );
  }

  return (
    <div className="analyze-page result-view-active">
      <div className="result-container">
        {/* BACK LINK */}
        <button 
          onClick={() => navigate('/history')} 
          className="detail-back-btn"
        >
          <div className="back-icon-pill">
            <ChevronLeft size={16} />
          </div>
          <span>Back to History</span>
        </button>

        <div className="result-card">
          <div className="result-header">
            <ShieldCheck size={20} />
            <span>Analysis Results</span>
          </div>
          
          <div className="result-body">
            <div className="result-img-wrapper">
               <img 
                 src={`http://localhost:8000/uploads/${prediction.userId}/${prediction.imagePath}`} 
                 alt={prediction.diseaseName} 
               />
            </div>
            <h1 className="disease-title">{prediction.diseaseName}</h1>
            
            <div className="confidence-section">
              <div className="section-label">Confidence Level</div>
              <div className="confidence-track">
                <div 
                  className="confidence-fill" 
                  style={{ width: `${prediction.confidence}%` }}
                >
                  {prediction.confidence}%
                </div>
              </div>
            </div>

            <div className="info-box-styled urgency-level">
              <div className="box-icon-side">
                <AlertCircle size={18} />
              </div>
              <div className="box-content">
                <span className="box-label">Urgency Level</span>
                <p className="box-text">
                  {prediction.severity === 'high' ? 'High - Immediate dermatological consultation required' :
                   prediction.severity === 'medium' ? 'Moderate - Schedule a check-up soon' :
                   prediction.urgency || 'Low - Annual skin check recommended'}
                </p>
              </div>
            </div>

            <div className="info-box-styled medical-advice">
               <div className="box-icon-side">
                 <Activity size={18} />
               </div>
               <div className="box-content">
                 <span className="box-label">Medical Advice</span>
                 <p className="box-text">{prediction.advice}</p>
               </div>
            </div>

            <div className="info-box-styled disclaimer-box">
              <div className="box-icon-side">
                <Info size={18} />
              </div>
              <div className="box-content">
                <span className="box-label">Disclaimer</span>
                <p className="box-disclaimer">
                  This is an AI-powered tool for educational purposes. Always consult a qualified healthcare professional for proper diagnosis and treatment.
                </p>
              </div>
            </div>

            <div className="result-actions">
              <button className="btn-ghost" onClick={() => navigate('/history')}>
                <Clock size={18} />
                View in History
              </button>
              <button className="btn-primary" onClick={() => navigate('/analyze')}>
                <Plus size={18} />
                Analyze Another
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="floating-settings">
        <Settings size={22} />
      </div>
    </div>
  );
};

export default PredictionDetail;
