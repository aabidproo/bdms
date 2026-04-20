#!/bin/bash

# Configuration
BACKEND_PORT=5001
FRONTEND_PORT=3000
PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

echo "------------------------------------------------"
echo "🩸 LifeLink - Starting Services"
echo "------------------------------------------------"

# Kill existing processes on these ports if any
echo "🔍 Cleaning up existing processes..."
lsof -ti :$BACKEND_PORT | xargs kill -9 2>/dev/null
lsof -ti :$FRONTEND_PORT | xargs kill -9 2>/dev/null

# Start Backend
echo "🚀 Starting Backend on port $BACKEND_PORT..."
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "🚀 Starting Frontend on port $FRONTEND_PORT..."
npx serve -l $FRONTEND_PORT frontend/LifeLink > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait a moment for servers to initialize
sleep 3

# Check and output status
echo "------------------------------------------------"
if curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null; then
    echo "✅ Backend:  RUNNING  → http://localhost:$BACKEND_PORT"
else
    echo "❌ Backend:  FAILED   (Check backend.log)"
fi

if curl -s http://localhost:$FRONTEND_PORT > /dev/null; then
    echo "✅ Frontend: RUNNING  → http://localhost:$FRONTEND_PORT"
else
    echo "❌ Frontend: FAILED   (Check frontend.log)"
fi
echo "------------------------------------------------"
echo "Logs available at: backend.log, frontend.log"
echo "To stop everything: kill $BACKEND_PID $FRONTEND_PID"
echo "------------------------------------------------"

# Keep the script running to keep the background tasks alive if needed
# wait $BACKEND_PID $FRONTEND_PID
