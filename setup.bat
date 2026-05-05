@echo off
REM Automated Setup Script for Skin Disease Detection App
REM Optimized for Python 3.12.10
REM This script sets up the complete environment on Windows

echo.
echo ========================================================================
echo   AI Skin Disease Detection - Automated Setup
echo   Python 3.12.10 Compatible
echo ========================================================================
echo.

REM Check Python installation
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    echo.
    echo Please install Python 3.12 from python.org
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

echo [STEP 1/6] Verifying Python installation...
python --version
echo [OK] Python is installed
echo.

REM Create virtual environment
echo [STEP 2/6] Creating virtual environment...
if exist "venv\" (
    echo [INFO] Virtual environment already exists. Removing old version...
    rmdir /s /q venv
)

python -m venv venv
if errorlevel 1 (
    echo [ERROR] Failed to create virtual environment!
    pause
    exit /b 1
)
echo [OK] Virtual environment created
echo.

REM Activate virtual environment
echo [STEP 3/6] Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] Failed to activate virtual environment!
    pause
    exit /b 1
)
echo [OK] Virtual environment activated
echo.

REM Upgrade pip
echo [STEP 4/6] Upgrading pip...
python -m pip install --upgrade pip --quiet
if errorlevel 1 (
    echo [WARNING] Failed to upgrade pip, continuing...
) else (
    echo [OK] Pip upgraded
)
echo.

REM Install requirements
echo [STEP 5/6] Installing dependencies...
echo This may take 5-10 minutes. Please wait...
echo.

pip install Flask==3.0.3
pip install tensorflow==2.17.0
pip install numpy==1.26.4
pip install Pillow==10.4.0
pip install Werkzeug==3.0.3
pip install gunicorn==22.0.0
pip install scikit-learn==1.5.1
pip install matplotlib==3.9.2

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to install some dependencies!
    echo.
    echo Trying alternative installation method...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Installation failed!
        echo.
        echo Please try manual installation:
        echo   1. Activate venv: venv\Scripts\activate.bat
        echo   2. Install: pip install -r requirements.txt
        echo.
        pause
        exit /b 1
    )
)

echo.
echo [OK] All dependencies installed
echo.

REM Create necessary directories
echo [STEP 6/6] Creating project directories...
if not exist "static\" mkdir static
if not exist "static\uploads\" mkdir static\uploads
if not exist "templates\" mkdir templates
if not exist "model\" mkdir model
if not exist "dataset\" mkdir dataset
if not exist "logs\" mkdir logs
echo [OK] Directories created
echo.

REM Deactivate virtual environment
call deactivate

echo.
echo ========================================================================
echo   Setup Complete!
echo ========================================================================
echo.
echo Next Steps:
echo.
echo   1. Generate a test model (for testing the interface):
echo      venv\Scripts\activate.bat
echo      python create_dummy_model.py
echo.
echo   2. OR prepare your dataset for training a real model:
echo      - Place images in dataset/ folder organized by disease
echo      - Run: python train_model.py
echo.
echo   3. Start the application:
echo      Run: run_app.bat
echo      OR manually: venv\Scripts\activate.bat
echo                   python app.py
echo.
echo   4. Open browser:
echo      http://localhost:5000
echo.
echo ========================================================================
echo.
pause