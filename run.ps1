# Start Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", ".venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000"

# Start Frontend
cd frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev -- --port 5173"
