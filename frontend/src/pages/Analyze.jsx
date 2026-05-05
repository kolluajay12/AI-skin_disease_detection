import { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Camera, 
  ShieldCheck, 
  AlertCircle, 
  X,
  Plus,
  Clock,
  Info,
  Activity,
  ChevronRight,
  Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Analyze.css';

const Analyze = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputMethod, setInputMethod] = useState('upload'); // 'upload' or 'camera'
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [prediction, setPrediction] = useState(null); // The scan result
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // CAMERA LOGIC
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      setError('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        setFile(file);
        setPreview(URL.createObjectURL(blob));
        stopCamera();
      }, 'image/jpeg');
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await axios.post('http://localhost:8000/api/predict', formData, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data'
        }
      });
      setPrediction(res.data);
    } catch (err) {
      setError(err.response?.data?.msg || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setFile(null);
    setPreview(null);
    setPrediction(null);
    setError(null);
    setIsCameraActive(false);
  };

  // AUTO-START CAMERA ON TAB CHANGE
  useEffect(() => {
    if (inputMethod === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [inputMethod]);

  // CLEANUP
  useEffect(() => {
    return () => stopCamera();
  }, []);

  // RESULT VIEW COMPONENT
  if (prediction) {
    return (
      <div className="analyze-page result-view-active">
        <div className="result-container">
          <div className="result-card">
            <div className="result-header">
              <ShieldCheck size={20} />
              <span>Analysis Results</span>
            </div>
            
            <div className="result-body">
              {preview && (
                <div className="result-img-wrapper">
                  <img src={preview} alt="Analyzed" />
                </div>
              )}
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
                   <p className="box-text">{prediction.advice || 'Personalized advice will appear here.'}</p>
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
                <button className="btn-primary" onClick={resetAnalysis}>
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
  }

  return (
    <div className="analyze-page">
      <div className="analyze-header">
         <h1><Activity /> Real-time Analysis</h1>
         <p>Capture or upload an image for immediate AI skin analysis</p>
      </div>

      <div className="analyze-card">
        <h2 className="input-method-title">Choose Input Method</h2>
        
        <div className="tabs">
          <button 
            className={`tab-btn ${inputMethod === 'upload' ? 'active' : ''}`}
            onClick={() => setInputMethod('upload')}
          >
            <Upload size={18} />
            <span>Upload File</span>
          </button>
          <button 
            className={`tab-btn ${inputMethod === 'camera' ? 'active' : ''}`}
            onClick={() => setInputMethod('camera')}
          >
            <Camera size={18} />
            <span>Use Camera</span>
          </button>
        </div>

        {inputMethod === 'upload' ? (
          <div className="upload-section">
            <label className="drop-zone" onDragOver={(e) => e.preventDefault()}>
              {preview ? (
                <img src={preview} alt="Preview" className="preview-img" />
              ) : (
                <>
                  <Upload size={48} className="cloud-icon" />
                  <h3>Drop image here</h3>
                  <p>Support for JPG, PNG and HEIC</p>
                </>
              )}
              <input type="file" hidden onChange={handleFileChange} accept="image/*" />
            </label>
            {preview && (
              <button className="clear-btn" onClick={() => { setFile(null); setPreview(null); }}>
                <X size={16} />
              </button>
            )}
          </div>
        ) : (
          <div className="camera-view">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className={`video-feed ${!isCameraActive ? 'hidden' : ''}`} 
            />
            
            {isCameraActive && (
              <button className="capture-btn" onClick={capturePhoto}>
                <div className="inner-circle"></div>
              </button>
            )}

            {!isCameraActive && (
              <div className="preview-container">
                 {preview && <img src={preview} alt="Capture" className="preview-img" />}
                 <button className="tab-btn active" onClick={startCamera}>
                   <Camera size={18} /> Re-open Camera
                 </button>
              </div>
            )}
          </div>
        )}

        <button 
          className="analyze-submit-btn" 
          disabled={!file || loading}
          onClick={handleAnalyze}
        >
          {loading ? (
            <div className="loading-spinner"></div>
          ) : (
            <>
              <span>Start Analysis</span>
              <ChevronRight size={18} />
            </>
          )}
        </button>

        {error && (
          <div className="error-msg">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
      </div>

      <div className="floating-settings">
        <Settings size={22} />
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default Analyze;
