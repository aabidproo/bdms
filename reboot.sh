#!/bin/bash
# Kill all possible conflicting processes
pkill -f "serve"
pkill -f "nodemon"
pkill -f "node src/server.js"
pkill -f "node /Users/bebinjungthapa/.npm/_npx"

# Start the frontend on a FRESH port
cd /Applications/XAMPP/xamppfiles/htdocs/BDMS
npx serve -l 3005 frontend/LifeLink > frontend_3005.log 2>&1 &

# Start the backend
cd /Applications/XAMPP/xamppfiles/htdocs/BDMS/backend
npm run dev > backend_3005.log 2>&1 &
