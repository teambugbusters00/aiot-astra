#!/usr/bin/env bash
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
AMBER='\033[0;33m'
RESET='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════╗"
echo "║   AI IoT Astra — Setup Script            ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${RESET}"

# ── Node.js check ─────────────────────────────
echo -e "${CYAN}[1/5] Checking Node.js...${RESET}"
if ! command -v node &>/dev/null; then
  echo "Node.js not found. Install from https://nodejs.org (v18+)"
  exit 1
fi
echo -e "${GREEN}  Node.js $(node -v) found${RESET}"

# ── Install dependencies ───────────────────────
echo -e "${CYAN}[2/5] Installing dependencies...${RESET}"
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
echo -e "${GREEN}  All dependencies installed${RESET}"

# ── Copy env files ─────────────────────────────
echo -e "${CYAN}[3/5] Setting up environment files...${RESET}"
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo -e "${AMBER}  Created backend/.env — please fill in your API keys${RESET}"
else
  echo -e "${GREEN}  backend/.env already exists${RESET}"
fi
if [ ! -f frontend/.env ]; then
  cp frontend/.env.example frontend/.env
  echo -e "${GREEN}  Created frontend/.env${RESET}"
fi

# ── Optional tool checks ────────────────────────
echo -e "${CYAN}[4/5] Checking optional tools...${RESET}"

check_tool() {
  if command -v "$1" &>/dev/null; then
    echo -e "${GREEN}  ✔ $1 found${RESET}"
  else
    echo -e "${AMBER}  ✗ $1 not found — $2${RESET}"
  fi
}

check_tool "arduino-cli"  "Install: https://arduino.github.io/arduino-cli/"
check_tool "pio"          "Install: pip install platformio"
check_tool "docker"       "Install: https://docs.docker.com/get-docker/"
check_tool "mongod"       "Or run: docker-compose up mongodb -d"
check_tool "mosquitto"    "Or run: docker-compose up mosquitto -d"

# ── Summary ────────────────────────────────────
echo ""
echo -e "${CYAN}[5/5] Setup complete!${RESET}"
echo ""
echo -e "  ${GREEN}Edit backend/.env and add your API keys:${RESET}"
echo "    NVIDIA_API_KEY=nvapi-..."
echo "    OPENROUTER_API_KEY=sk-or-..."
echo "    GROQ_API_KEY=gsk_..."
echo ""
echo -e "  ${GREEN}Start dev servers:${RESET}"
echo "    npm run dev"
echo ""
echo -e "  ${GREEN}Or start with Docker (MongoDB + MQTT):${RESET}"
echo "    docker-compose up mongodb mosquitto -d"
echo "    npm run dev"
echo ""
echo -e "${CYAN}  Backend  →  http://localhost:4000${RESET}"
echo -e "${CYAN}  Frontend →  http://localhost:5173${RESET}"
echo ""
