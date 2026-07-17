# AI IoT Astra

> **Build, Simulate, and Deploy IoT Devices — Just by Talking to AI.**

Full-stack, production-ready AI-powered IoT development platform.  
Natural language prompt → circuit plan + firmware + live dashboard + OTA deploy.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TypeScript + TailwindCSS + Framer Motion |
| Code Editor | Monaco Editor |
| Charts | Recharts |
| Realtime | Socket.IO |
| Backend | Node.js + TypeScript + Express |
| Database | MongoDB (mongoose) + in-memory fallback |
| AI Tier 1 | DeepSeek-R1 via OpenRouter (circuit planning) |
| AI Tier 2 | Qwen2.5-Coder 7B via SiliconFlow (firmware gen) |
| AI Tier 3 | Llama 3.2 8B via OpenRouter (validation) |
| AI Fallback | Anthropic Claude claude-sonnet-4-6 |
| Simulation | avr8js (AVR browser-native) + QEMU + Renode |
| MQTT | Mosquitto broker |
| Compiler | arduino-cli + PlatformIO |
| Deploy | espota.py (OTA) + arduino-cli (USB) + SSH |
| Container | Docker + Docker Compose |

---

## Platforms Supported

| Platform | MCU | Compiler | Simulator | Deploy |
|---|---|---|---|---|
| Arduino Uno/Mega | ATmega328P/2560 | arduino-cli | avr8js | USB |
| ESP32 / ESP8266 | Xtensa LX6/LX106 | esp-idf + PIO | QEMU Xtensa | OTA |
| ARM Cortex-M | STM32 · nRF52 · RP2040 | arm-none-eabi-gcc | Renode | SWD/OTA |
| RISC-V | ESP32-C3/C6 · GD32 | riscv32-elf-gcc | QEMU RISC-V | OTA |
| MicroPython | ESP32 · RP2040 | micropython-unix | REPL emu | WebREPL |
| RPi / Linux SBC | BCM2711+ | aarch64-linux-gnu | QEMU/Docker | SSH |

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/yourname/aiot-studio
cd aiot-studio
npm run install:all
```

### 2. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Fill in: ANTHROPIC_API_KEY, OPENROUTER_API_KEY, SILICONFLOW_API_KEY

# Frontend
cp frontend/.env.example frontend/.env
```

### 3. Start dev servers

```bash
npm run dev
# Backend  → http://localhost:4000
# Frontend → http://localhost:5173
```

### 4. (Optional) Start MongoDB + Mosquitto via Docker

```bash
docker-compose up mongodb mosquitto -d
```

> Without MongoDB the app runs in **in-memory mode** (data lost on restart).  
> Without Mosquitto the dashboard shows **demo data**.

---

## Project Structure

```
aiot-studio/
├── backend/
│   └── src/
│       ├── index.ts              # Express + Socket.IO boot
│       ├── config/               # DB + logger
│       ├── middleware/           # JWT auth
│       ├── types/                # Shared TS types
│       └── modules/
│           ├── auth/             # JWT + OAuth
│           ├── ai/               # Multi-tier LLM routing
│           ├── simulation/       # Compile + session management
│           ├── mqtt/             # Mosquitto + WS bridge
│           ├── deploy/           # OTA + USB + SSH
│           ├── projects/         # CRUD + versioning
│           ├── serial/           # Live serial console
│           └── billing/          # Credits + Stripe (stub)
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Home.tsx
│       │   ├── Workspace.tsx     # AI prompt + Monaco editor
│       │   ├── Simulation.tsx    # avr8js virtual components
│       │   ├── Dashboard.tsx     # MQTT live charts
│       │   ├── Deployment.tsx    # OTA / USB / SSH deploy
│       │   ├── Projects.tsx      # Project manager
│       │   └── Login.tsx
│       ├── components/
│       │   └── Navbar.tsx
│       ├── hooks/
│       │   └── useSocket.ts      # Socket.IO hook
│       └── lib/
│           ├── api.ts            # Axios API client
│           └── store.ts          # Zustand global state
├── mosquitto/config/             # Mosquitto broker config
├── docker-compose.yml
└── package.json                  # Monorepo scripts
```

---

## Backend API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, get JWT |
| POST | `/auth/demo` | Demo login (no signup) |
| GET | `/auth/me` | Get current user |

### AI
| Method | Endpoint | Description |
|---|---|---|
| POST | `/ai/generate` | Full generation: circuit + code |
| POST | `/ai/components` | Extract components from prompt |
| POST | `/ai/code` | Generate code only |
| POST | `/ai/diagram` | Generate Wokwi diagram |
| POST | `/ai/validate` | Validate code or circuit |
| GET | `/ai/generation/:id` | Get cached generation |

### Simulation
| Method | Endpoint | Description |
|---|---|---|
| POST | `/simulation/compile` | Compile .ino → .hex |
| POST | `/simulation/create` | Create session |
| GET | `/simulation/:id` | Get session |
| POST | `/simulation/:id/pin` | Set pin state |
| POST | `/simulation/:id/serial` | Send serial data |
| DELETE | `/simulation/:id` | End session |

### Projects
| Method | Endpoint | Description |
|---|---|---|
| GET | `/projects` | List my projects |
| GET | `/projects/public` | List public projects |
| POST | `/projects/create` | Create project |
| GET | `/projects/:id` | Get project |
| PUT | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project |
| POST | `/projects/:id/clone` | Clone project |

### Deploy
| Method | Endpoint | Description |
|---|---|---|
| POST | `/deploy/ota` | OTA flash via espota.py |
| POST | `/deploy/usb` | USB flash via arduino-cli |
| POST | `/deploy/ssh` | SSH deploy to Linux SBC |
| GET | `/deploy/devices` | List registered devices |
| POST | `/deploy/devices/register` | Register a device |

### MQTT
| Method | Endpoint | Description |
|---|---|---|
| GET | `/mqtt/status` | Broker connection status |
| GET | `/mqtt/cache` | Last known values per topic |
| POST | `/mqtt/subscribe` | Subscribe to topic |
| POST | `/mqtt/publish` | Publish to topic |

### Serial
| Method | Endpoint | Description |
|---|---|---|
| GET | `/serial/ports` | List serial ports |
| POST | `/serial/connect` | Open serial connection |
| POST | `/serial/write` | Write to serial |
| DELETE | `/serial/disconnect/:id` | Close serial |

---

## Socket.IO Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `simulation:join` | `sessionId` | Join simulation room |
| `mqtt:subscribe` | `topic` | Subscribe to MQTT topic |
| `mqtt:publish` | `{topic, payload}` | Publish MQTT message |
| `pin:set` | `{sessionId, pin, value}` | Inject pin state |
| `serial:send` | `{sessionId, data}` | Send serial data |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `mqtt:message` | `{topic, payload, timestamp}` | Topic-specific message |
| `mqtt:any` | `{topic, payload, timestamp}` | Any MQTT message |
| `pin:update` | `{pin, value}` | Pin state changed |
| `serial:line` | `{line, timestamp}` | Serial output line |
| `serial:error` | `{error}` | Serial error |
| `deploy:log` | `{deployId, line}` | Realtime deploy log |

---

## AI Routing Logic

```
User Prompt
     │
     ├─► Tier 1: DeepSeek-R1 (OpenRouter)     ← circuit planning, component selection
     │         └─ Fallback: Claude claude-sonnet-4-6
     │
     ├─► Tier 2: Qwen2.5-Coder 7B (SiliconFlow) ← firmware generation
     │         └─ Fallback: Claude claude-sonnet-4-6
     │
     └─► Tier 3: Llama 3.2 8B (OpenRouter)    ← validation, fast tasks
               └─ Fallback: Claude Haiku
```

---

## Tools Required (Optional)

| Tool | Purpose | Install |
|---|---|---|
| `arduino-cli` | Compile + USB flash AVR/ESP | [arduino.github.io](https://arduino.github.io/arduino-cli/) |
| `platformio` | Multi-platform compile | `pip install platformio` |
| `esptool` / espota | OTA flash ESP32 | `pip install esptool` |
| `sshpass` | SSH deploy with password | `apt install sshpass` |
| MongoDB | Persistent storage | Docker or [mongodb.com](https://www.mongodb.com) |
| Mosquitto | MQTT broker | Docker or `apt install mosquitto` |

> All tools are **optional** — the app runs in demo/in-memory mode without them.

---

## Deployment

### Vercel (Frontend)
```bash
cd frontend && npm run build
# Deploy dist/ to Vercel
```

### Railway / Render (Backend)
```bash
# Set environment variables in dashboard
# Build: cd backend && npm install && npm run build
# Start: node dist/index.js
```

### Full Docker
```bash
docker-compose up --build
```

---

## License

MIT — © AI IoT Astra 2026
