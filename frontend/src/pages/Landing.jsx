import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  Brain,
  Activity,
  LogIn,
  UserPlus,
  AlertTriangle,
  Microscope
} from 'lucide-react';

import './Landing.css';

const Landing = () => {
  return (<div className="landing">

    {/* HERO */}
    <section className="hero">

      {/* LEFT SIDE */}
      <motion.div
        className="hero-left"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1>
          AI-Powered Skin <br />
          Disease Detection
        </h1>

        <p>
          Advanced machine learning technology to help identify 10 skin
          conditions instantly. Get personalized medical advice and track your
          skin health journey.
        </p>

        <div className="hero-buttons">
          <Link to="/register" className="btn-primary">
            <UserPlus size={16} />
            Get Started
          </Link>

          <Link to="/login" className="btn-link">
            <LogIn size={16} />
            Login
          </Link>
        </div>
      </motion.div>

      {/* RIGHT SIDE */}
      <div className="hero-right">
        <Microscope className="hero-icon" />
      </div>

    </section>

    {/* WHY CHOOSE SECTION */}
    <section className="section benefit-section">
      <div className="section-header-modern">
        <span className="section-tag">Core Advantages</span>
        <h2>Why Choose Our Platform?</h2>
      </div>

      <div className="benefit-grid">
        {[
          {
            icon: Brain,
            title: "AI-Powered Analysis",
            desc: "Advanced deep learning algorithms trained on thousands of medical images for accurate detection.",
            color: "#3b82f6"
          },
          {
            icon: Activity,
            title: "Track Your Progress",
            desc: "Keep a detailed history of all your scans and monitor changes over time with personalized insights.",
            color: "#10b981"
          },
          {
            icon: Shield,
            title: "Privacy First",
            desc: "Your data is encrypted and secure. Only you have access to your medical history and scans.",
            color: "#f59e0b"
          }
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.2 }}
            className="benefit-card-modern"
          >
            <div className="benefit-icon-wrapper" style={{ '--icon-color': item.color }}>
              <div className="icon-inner-glow"></div>
              <item.icon size={32} />
            </div>
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>

    {/* HOW IT WORKS */}
    <section className="section center">
      <h2>How It Works</h2>

      <div className="steps">
        {[
          { title: "Create Account", desc: "Sign up for free in seconds" },
          { title: "Upload Image", desc: "Take a photo or upload existing image" },
          { title: "Get Results", desc: "AI analyzes and provides diagnosis" },
          { title: "Take Action", desc: "Follow personalized advice" }
        ].map((item, i) => (
          <div key={i} className="step">
            <div className="step-circle">{i + 1}</div>
            <h4>{item.title}</h4>
            <p className="step-desc">{item.desc}</p>
          </div>
        ))}
      </div>

    </section>

    {/* CONDITIONS DETECTION SECTION */}
    <section className="section center conditions-section">
      <div className="section-head">
        <h2>Advanced Detection Capabilities</h2>
        <p className="sub-text-premium">Our AI model is trained to recognize 10 major skin conditions with high accuracy</p>
      </div>

      <div className="conditions-grid-modern">
        {[
          'Melanoma', 'Basal Cell Carcinoma', 'Actinic Keratosis', 'Atopic Dermatitis',
          'Psoriasis', 'Acne Vulgaris', 'Vitiligo', 'Folliculitis', 'Ringworm', 'Viral Warts'
        ].map((item, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.05 }}
            className="condition-badge-modern"
          >
            <div className="check-circle-small">✓</div>
            <span>{item}</span>
          </motion.div>
        ))}
      </div>
    </section>

    {/* CTA */}
    <section className="section center">
      <div className="cta">
        <h2>Ready to Get Started?</h2>
        <p>Join thousands of users monitoring their skin health</p>
        <Link to="/register" className="cta-btn">
          <UserPlus size={16} /> Create Free Account
        </Link>
      </div>
    </section>

    {/* DISCLAIMER SECTION */}
    <section className="section disclaimer-section">
      <div className="disclaimer-card">
        <div className="disclaimer-icon-box">
          <AlertTriangle size={24} />
        </div>
        <div className="disclaimer-content">
          <h3>Medical Disclaimer</h3>
          <p>
            Skin Disease AI is designed for <strong>educational and informational purposes only</strong>.
            The analysis provided by our AI should not be considered a clinical diagnosis or a professional
            medical opinion. Always seek the advice of your physician or other qualified health provider
            with any questions regarding a medical condition.
          </p>
        </div>
      </div>

      <p className="footer-copyright">
        © 2026 Skin Disease AI. All rights reserved.
      </p>
    </section>

  </div>

  );
};

export default Landing;
