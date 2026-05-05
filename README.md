# DermAI - MERN Stack Migration

This project has been successfully converted from a Flask-only application to a full MERN stack (MongoDB, Express, React, Node.js) while maintaining the original ML model in a Python secondary service.

## Project Structure

- `/frontend`: React + Vite + Tailwind CSS (Port 5173)
- `/backend`: Node.js + Express + MongoDB (Port 5000)
- `/model_service`: Python Flask API for ML Predictions (Port 5001)

## Prerequisites

- **Node.js**: v18+
- **Python**: 3.9+ (with TensorFlow, Flask, PIL)
- **MongoDB**: Running locally on `mongodb://localhost:27017`

## How to Run

1.  **Start MongoDB**: Ensure your local MongoDB instance is active.
2.  **Run with Batch file**:
    - Double-click `run_mern.bat` in the root folder.
    - This will open three terminal windows for each service.
3.  **Manual Start**:
    - **Model Service**: `cd model_service && python app.py`
    - **Backend**: `cd backend && npm run dev`
    - **Frontend**: `cd frontend && npm run dev`

## Main Features

- **JWT Authentication**: Secure user registration and login.
- **Premium UI**: Modern dark-mode aesthetic with glassmorphism and smooth animations.
- **ML Integration**: Node.js backend proxies image data to the Python TensorFlow service.
- **Result History**: Full history of scans stored in MongoDB with image persistence.
- **Detailed Reports**: Comprehensive analysis results with severity indicators and medical disclaimers.

## Backend `.env` Configuration
The backend uses a `.env` file for configuration:
```env

```
