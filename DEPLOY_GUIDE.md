# AI IoT Astra — Deployment Guide

This guide provides step-by-step instructions for deploying the full **AI IoT Astra** stack, including the **Frontend SPA**, **Node.js Backend**, **MongoDB Database**, and **Eclipse Mosquitto MQTT Broker** (using Docker), both locally and for **24/7 active cloud hosting**.

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [24/7 Cloud Deployment Options](#247-cloud-deployment-options)
   - [Option A: Single VPS with Docker Compose (Recommended for 24/7)](#option-a-single-vps-with-docker-compose-recommended-for-247)
   - [Option B: Managed PaaS (Vercel + Railway/Render + MongoDB Atlas)](#option-b-managed-paas-vercel--railwayrender--mongodb-atlas)
5. [Local / Development Deployments](#local--development-deployments)
   - [Method 1: Full Local Docker Compose Deployment](#method-1-full-local-docker-compose-deployment)
   - [Method 2: Hybrid Local Deployment](#method-2-hybrid-local-deployment)
6. [MQTT Broker Setup & Verification](#mqtt-broker-setup--verification)
7. [SSL Setup (Nginx + Certbot)](#ssl-setup-nginx--certbot)
8. [Health Checks & Troubleshooting](#health-checks--troubleshooting)

---

## System Architecture

```
                       ┌─────────────────────────────────────────┐
                       │           Browser / Web UI              │
                       │     (React 18 + Vite + Socket.IO)       │
                       └──────────────────┬──────────────────────┘
                                          │
                        HTTP REST / WS    │    MQTT WebSockets (9001)
                      ┌───────────────────┴───────────────────┐
                      ▼                                       ▼
           ┌───────────────────────┐             ┌─────────────────────────┐
           │     astra-backend     │             │       astra-mqtt        │
           │ Node.js/Express (4000)│◄───────────►│ Eclipse Mosquitto (1883)│
           └──────────┬────────────┘  MQTT TCP   └─────────────────────────┘
                      │
                      ▼
           ┌───────────────────────┐
           │      astra-mongo      │
           │    MongoDB 7 (27017)  │
           └───────────────────────┘
```

The application consists of four main components:
- **Frontend SPA**: React 18, Vite, TypeScript, TailwindCSS, Monaco Editor.
- **Backend API & WS Server**: Express + Socket.IO server handling REST endpoints, AI orchestration (NVIDIA, OpenRouter, Groq), firmware compilation (`arduino-cli`), and MQTT bridging.
- **MQTT Broker**: Eclipse Mosquitto container serving standard MQTT (port 1883) and WebSockets (port 9001).
- **Database**: MongoDB 7 for storing projects, user credentials, and device records (with in-memory fallback support).

---

## Prerequisites

Before deploying, ensure you have:
- A cloud virtual server (VPS) or cloud platform account (DigitalOcean, Hetzner, AWS, Linode, Railway, Render, Vercel)
- [Docker Engine](https://docs.docker.com/get-docker/) (v20.10+) & [Docker Compose](https://docs.docker.com/compose/) (v2.0+)
- Node.js (v18.0+) & npm (if building static assets locally)
- A domain name (e.g. `aiot-astra.com` or subdomains `api.aiot-astra.com`, `mqtt.aiot-astra.com`)

### Required API Keys
Obtain API keys for your AI models:
- **NVIDIA AI Endpoints**: `NVIDIA_API_KEY` (Tier 1 & Tier 2 reasoning and firmware code)
- **OpenRouter**: `OPENROUTER_API_KEY` (Fallback reasoning)
- **Groq**: `GROQ_API_KEY` (Tier 3 fast validation)

---

## Environment Configuration

### 1. Root `.env` (used by Docker Compose)
Create a `.env` file in the project root:

```ini
# ── Application Settings ──
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://your-domain.com

# ── Security ──
JWT_SECRET=replace_with_a_secure_random_jwt_secret_string

# ── Database ──
MONGODB_URI=mongodb://mongodb:27017/ai-iot-astra

# ── MQTT Broker ──
MQTT_BROKER_URL=mqtt://mosquitto:1883

# ── AI Providers ──
NVIDIA_API_KEY=nvapi-your-nvidia-api-key
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1

OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

GROQ_API_KEY=gsk_your_groq_api_key
GROQ_BASE_URL=https://api.groq.com/openai/v1

# ── AI Model Selections ──
AI_REASONING_MODEL=meta/llama-3.1-8b-instruct
AI_CODE_MODEL=qwen/qwen2.5-coder-32b-instruct
AI_FAST_MODEL=llama-3.1-8b-instant
```

---

## 24/7 Cloud Deployment Options

### Option A: Single VPS with Docker Compose (Recommended for 24/7)

Deploying to a single Cloud VPS (e.g. Hetzner $4.50/mo, DigitalOcean $6/mo, or AWS EC2 t3.small) using Docker Compose is the most reliable, 24/7 active solution.

#### Why this is recommended:
- **Persistent WebSockets**: Keeps Socket.IO and Mosquitto WebSocket channels alive indefinitely.
- **Embedded Arduino CLI**: Code compilation runs natively inside the backend container.
- **Hardware-friendly MQTT**: Supports raw TCP port `1883` for microcontrollers (ESP32/Arduino) and WebSockets port `9001` for browsers.
- **Auto-restart**: Containers automatically restart on server reboots (`restart: unless-stopped`).

#### Step-by-Step Instructions:

1. **Provision your Server & SSH in**:
   ```bash
   ssh root@<your-vps-ip>
   ```

2. **Install Docker & Docker Compose**:
   ```bash
   curl -fsSL https://get.docker.com | sh
   apt-get install -y docker-compose-plugin git nginx certbot python3-certbot-nginx
   ```

3. **Clone Repository & Build Assets**:
   ```bash
   git clone https://github.com/yourname/aiot-studio.git /opt/aiot-studio
   cd /opt/aiot-studio
   npm run install:all
   npm run build
   ```

4. **Configure `.env`**:
   ```bash
   cp backend/.env.example .env
   nano .env
   # Fill in NVIDIA_API_KEY, GROQ_API_KEY, JWT_SECRET, etc.
   ```

5. **Start Docker Containers 24/7**:
   ```bash
   docker compose up -d --build
   ```

6. **Enable Docker Autostart on Boot**:
   ```bash
   systemctl enable docker
   ```

---

### Option B: Managed PaaS (Vercel + Railway/Render + MongoDB Atlas)

If you prefer managed cloud platforms without server management:

#### 1. Database (MongoDB Atlas)
- Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
- Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/ai-iot-astra`.
- Set Network Access to `0.0.0.0/0` (Allow access from anywhere).

#### 2. Backend + MQTT (Railway or Render)
- **Railway**: Deploy using Dockerfile context `./backend`. Railway persistent services support open ports and Socket.IO.
- **Render**: Connect repository and select `render.yaml`. Fill in required environment variables in Render Dashboard.

#### 3. Frontend (Vercel)
- Import repo on [Vercel](https://vercel.com).
- Build command: `npm run install:all && npm run build`
- Output directory: `backend/public`
- Environment Variable: `VITE_API_URL=https://your-backend-railway.up.railway.app`

---

## Local / Development Deployments

### Method 1: Full Local Docker Compose Deployment

```bash
npm run install:all
npm run build
docker-compose up -d --build
```
Access app at `http://localhost:4000`.

### Method 2: Hybrid Local Deployment

```bash
docker-compose up mongodb mosquitto -d
npm run dev
```
Access Vite dev server at `http://localhost:5173`.

---

## MQTT Broker Setup & Verification

Mosquitto configuration at `mosquitto/config/mosquitto.conf`:

```ini
listener 1883
allow_anonymous true

listener 9001
protocol websockets
allow_anonymous true

persistence true
persistence_location /mosquitto/data/
log_dest file /mosquitto/log/mosquitto.log
log_type error
log_type warning
log_type notice
log_type information
```

### Test Broker Connection:
```bash
# Publish test message
docker exec -it astra-mqtt mosquitto_pub -t "test/topic" -m "Ping 24/7"

# Subscribe to messages
docker exec -it astra-mqtt mosquitto_sub -t "test/topic"
```

---

## SSL Setup (Nginx + Certbot)

For a 24/7 production VPS setup with HTTPS and WSS (secure WebSockets):

1. **Create Nginx Site Config** (`/etc/nginx/sites-available/aiot-astra`):
   ```nginx
   server {
       server_name app.yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:4000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location /mqtt-ws/ {
           proxy_pass http://127.0.0.1:9001/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
       }
   }
   ```

2. **Enable site and issue free Let's Encrypt SSL certificate**:
   ```bash
   ln -s /etc/nginx/sites-available/aiot-astra /etc/nginx/sites-enabled/
   nginx -t
   systemctl reload nginx
   certbot --nginx -d app.yourdomain.com
   ```

---

## Health Checks & Troubleshooting

### 1. Health Endpoint Check
```bash
curl https://app.yourdomain.com/health
```

Expected output:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 86400,
  "mqtt": {
    "connected": true,
    "brokerUrl": "mqtt://mosquitto:1883"
  },
  "timestamp": "2026-07-20T16:45:00.000Z"
}
```

### 2. Common Troubleshooting Steps

| Issue | Cause | Fix |
|---|---|---|
| **Container stops on terminal close** | Docker started without `-d` | Run `docker compose up -d` |
| **Containers don't start on reboot** | Restart policy missing | Ensure `restart: unless-stopped` in `docker-compose.yml` |
| **MQTT WebSockets failing in HTTPS site** | Mixed content (`ws://` vs `wss://`) | Proxy Mosquitto port `9001` through Nginx with SSL as shown in SSL setup |

---

## 24/7 Maintenance Commands

```bash
# Check running status of 24/7 containers
docker compose ps

# View live backend logs
docker logs -f astra-backend

# Update application to latest git version
git pull && npm run build && docker compose up -d --build
```
