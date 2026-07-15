#!/bin/bash
# Mabishion AI — Desktop Launcher
APP_DIR="/home/admin-ubuntu/Desktop/Mabishion-AI/Mabishion Software"
LOGFILE="$APP_DIR/launcher_error.log"

exec > "$LOGFILE" 2>&1

echo "--- Launching Mabishion AI at $(date) ---"

# 0. Kill existing instances on port 1420
echo "Clearing port 1420..."
lsof -ti :1420 | xargs kill -9 2>/dev/null || true
sleep 1

# 1. Load NVM / Node environment
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export PATH="$PATH:/usr/local/bin:/usr/bin:$HOME/.cargo/bin"

# Vite can hit Linux inotify watcher limits on this machine. Polling keeps the desktop launcher reliable.
export CHOKIDAR_USEPOLLING=true
export WATCHPACK_POLLING=true

# 2. Start Ollama in background (optional — skip if not installed)
if command -v ollama &>/dev/null; then
    if ! pgrep -x "ollama" > /dev/null; then
        echo "Starting Ollama..."
        export OLLAMA_ORIGINS="*"
        ollama serve &
        sleep 2
    fi
else
    echo "Ollama not installed — skipping (cloud LLMs will be used)"
fi

# 3. Launch the App
echo "Starting Tauri App..."
cd "$APP_DIR"
npm run tauri dev
