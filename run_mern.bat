@echo off
echo ==========================================
echo DermAI - Full Stack Setup
echo ==========================================

echo [1/3] Starting ML Service (Port 5000)...
start cmd /k "cd ml && python predict.py"

echo [2/3] Starting Backend Server (Port 8000)...
start cmd /k "cd backend && npm run dev"

echo [3/3] Starting Frontend (Port 5173)...
start cmd /k "cd frontend && npm run dev"

echo ==========================================
echo All services are starting in separate windows.
echo - ML Service:  http://localhost:5000
echo - Backend:     http://localhost:8000
echo - Frontend:    http://localhost:5173
echo ==========================================
pause
