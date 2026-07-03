#!/bin/bash
# Nexious AI — Autonomous Killer & Launcher
LOGFILE="/home/admin-ubuntu/Desktop/Nexious-AI/Mickii/nexious-ai-starter/launcher_error.log"

exec > "$LOGFILE" 2>&1

echo "--- Launching Nexious AI at $(date) ---"

# 0. Kill existing instances on port 1420
echo "Clearing port 1420..."
lsof -ti :1420 | xargs kill -9 || true
sleep 1

# 1. Load NVM / Node environment
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export PATH="$PATH:/usr/local/bin:/usr/bin:/bin"

# 2. Start Ollama in background
if ! pgrep -x "ollama" > /dev/null
then
    echo "Starting Ollama..."
    export OLLAMA_ORIGINS="*"
    ollama serve &
    sleep 3
fi

# 3. Launch the App
echo "Starting Tauri App..."
cd /home/admin-ubuntu/Desktop/Nexious-AI/Mickii/nexious-ai-starter
npm run tauri dev
