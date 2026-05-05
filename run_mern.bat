@echo off
echo ==========================================
echo DermAI - MERN Stack Setup
echo ==========================================

echo [1/2] Starting Backend Server (Port 8000)...
start cmd /k "cd backend && npm run dev"

echo [2/2] Starting Frontend (Port 5173)...
start cmd /k "cd frontend && npm run dev"

echo ==========================================
echo All services are starting in separate windows.
echo Make sure you have MongoDB running on localhost:27017
echo ==========================================
pause
