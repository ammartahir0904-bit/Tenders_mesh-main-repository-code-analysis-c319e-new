#!/usr/bin/env bash

# ============================================================
# TenderMesh - Linux (Ubuntu) Launcher Root Entrypoint
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$SCRIPT_DIR/docker-1"

if [ -d "$TARGET_DIR" ]; then
    echo "Starting TenderMesh using docker-1..."
    cd "$TARGET_DIR" || exit 1
    
    # Check if we have sudo privileges for docker if needed
    if groups | grep -q '\bdocker\b'; then
        docker compose up --build -d
    else
        sudo docker compose up --build -d
    fi
    
    echo "TenderMesh is starting in the background. Access at http://localhost:3001"
else
    echo "[ERROR] Cannot find $TARGET_DIR"
    exit 1
fi
