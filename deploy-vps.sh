#!/usr/bin/env bash
# =======================================================
# TenderMesh Automated VPS Setup & Deployment Script
# =======================================================

set -e

echo "🚀 Starting TenderMesh Cloud Setup..."

# 1. Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install Docker and Docker Compose if missing
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker & Docker Compose..."
    sudo apt install -y docker.io docker-compose git
    sudo systemctl enable --now docker
    sudo usermod -aG docker $USER
else
    echo "✅ Docker is already installed."
fi

# 3. Ensure docker-compose is executable
echo "⚙️ Building and starting TenderMesh Docker containers..."
sudo docker compose -f docker-1/docker-compose.yml up --build -d

echo "======================================================="
echo "🎉 TenderMesh successfully deployed!"
echo "🌐 Access your app at: http://$(hostname -I | awk '{print $1}'):3001"
echo "======================================================="
