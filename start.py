#!/usr/bin/env python3
"""FixArchive — cross-platform launcher. Run with: python start.py"""
import subprocess, sys, os
from pathlib import Path

ROOT = Path(__file__).parent
VENV = ROOT / "venv"
IS_WIN = sys.platform == "win32"
VENV_PY  = VENV / ("Scripts/python.exe" if IS_WIN else "bin/python")
VENV_PIP = VENV / ("Scripts/pip.exe"    if IS_WIN else "bin/pip")

def run(*args, **kwargs):
    subprocess.run(args, check=True, **kwargs)

def output(*args):
    return subprocess.run(args, capture_output=True, text=True).stdout

def header(msg): print(f"\033[32m{msg}\033[0m")
def info(msg):   print(f"\033[33m{msg}\033[0m")

header("FixArchive — Local App Launcher\n")

# 1. Python venv + dependencies
if not VENV_PY.exists():
    info("Creating Python virtual environment...")
    run(sys.executable, "-m", "venv", str(VENV))
    info("Installing Python dependencies...")
    run(str(VENV_PIP), "install", "-q", "-r", "requirements.txt", cwd=ROOT)
else:
    dry = output(str(VENV_PIP), "install", "-q", "--dry-run", "-r", "requirements.txt")
    if "Would install" in dry:
        info("Updating Python dependencies...")
        run(str(VENV_PIP), "install", "-q", "-r", "requirements.txt", cwd=ROOT)
    else:
        print("Python dependencies up to date.")

# 2. Frontend deps
frontend = ROOT / "frontend"
if not (frontend / "node_modules").exists():
    info("Installing frontend dependencies...")
    run("npm", "install", cwd=frontend, shell=IS_WIN)
else:
    print("Frontend dependencies up to date.")

# 3. Frontend build
dist = frontend / "dist"
src  = frontend / "src"
needs_build = not dist.exists() or (
    max((f.stat().st_mtime for f in src.rglob("*") if f.is_file()), default=0)
    > dist.stat().st_mtime
)
if needs_build:
    info("Building frontend...")
    run("npm", "run", "build", cwd=frontend, shell=IS_WIN)
else:
    print("Frontend build is current.")

# 4. Start server
header("\nStarting server at http://localhost:8000")
print("Press Ctrl+C to stop.\n")
run(str(VENV_PY), "-m", "uvicorn", "backend.main:app",
    "--host", "0.0.0.0", "--port", "8000", "--reload", cwd=ROOT)
