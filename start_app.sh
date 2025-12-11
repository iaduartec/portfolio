#!/bin/bash
# Script to launch the Portfolio Visualizer

# Ensure venv exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Determine available port (default 8501)
PORT=8501
echo "🚀 Starting Portfolio Visualizer on port $PORT..."
echo "👉 Open your browser at http://localhost:$PORT"

streamlit run app.py --server.port $PORT --server.headless true
