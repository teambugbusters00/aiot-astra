# AI IoT Astra — Project Documentation

This documentation provides an in-depth view of how **AI IoT Astra** works, its underlying architecture, API services, AI model tiers, the role of mock/demo fallbacks, and the next steps required to fully customize and deploy the system.

---

## 1. Project Status & Architecture Overview

**AI IoT Astra** is a full-stack, production-ready development platform designed to enable natural language hardware design, firmware compilation, and virtual execution in a browser-based simulator. 

### System Architecture

```mermaid
graph TD
    %% Frontend Layer
    subgraph Frontend [Client Browser - React 18 + Vite]
        UI[Interactive UI & Workspace]
        Monaco[Monaco Code Editor]
        AVR[avr8js MCU Simulator]
        WS[Socket.IO WS Client]
    end

    %% Backend Layer
    subgraph Backend [Backend Server - Express + TypeScript]
        API[API Endpoints Routing]
        AIOrch[AI Multi-Tier Orchestrator]
        SimSrv[Simulated HEX Fallback]
        MQTTEmu[MQTT Live Telemetry Streamer]
    end

    %% Database & Brokers
    subgraph Infrastructure [Data & Messaging Services]
        DB[(MongoDB Atlas / In-Memory Fallback)]
        MQTT[Mosquitto MQTT Broker]
    end

    %% External APIs
    subgraph ExternalAPIs [Multi-Tier AI Services]
        OR[OpenRouter - DeepSeek-R1]
        NV[NVIDIA AI - Gemma 4]
        GR[Groq - Llama 3.3]
    end

    %% Connections
    UI <-->|HTTPS| API
    UI <-->|WebSocket| WS
    WS <-->|Telemetry Bridging| MQTTEmu
    API <-->|State Management| DB
    API <-->|Orchestrate Prompt| AIOrch
    AIOrch <-->|Reasoning / Circuit Plan| OR
    AIOrch <-->|Firmware CodeGen| NV
    AIOrch <-->|Fast Validation| GR
    MQTTEmu <-->|Publish/Subscribe| MQTT
    AVR <-->|Runs base64 HEX| Monaco
```

### Testing & Simulation Flow

This diagram outlines how testing and execution are verified step-by-step in the workspace, demonstrating how real compilers and fallback systems are engaged:

```mermaid
sequenceDiagram
    actor User as Tester / Developer
    participant FE as Frontend (Vite App)
    participant BE as Backend (Express Server)
    participant LLM as Multi-Tier LLM APIs
    participant Sim as avr8js Virtual MCU

    User->>FE: Inputs Prompt & selects platform (Uno/ESP32)
    FE->>BE: POST /ai/generate
    BE->>LLM: Requests Circuit Blueprint, Firmware & Validation
    LLM-->>BE: Returns blueprint, code, validation result
    BE-->>FE: Returns workspace payload
    FE->>User: Displays components list & code in editor

    %% Compilation Flow
    Note over User, BE: Compilation Phase
    User->>FE: Clicks "Compile & Run"
    FE->>BE: POST /simulation/compile {code}
    alt Local toolchain available (arduino-cli)
        BE->>BE: Execute arduino-cli / pio compile command
        BE-->>FE: Return genuine compiled HEX
    else Local toolchain NOT available (Demo Mode)
        BE-->>FE: Return warning + mock base64 HEX (fallback)
    end

    %% Execution & Simulation Flow
    Note over FE, Sim: Simulation Phase
    FE->>Sim: Load HEX binary into virtual memory
    FE->>Sim: Initialize pins & Virtual Components (LEDs, Sensors)
    loop Simulation runtime
        Sim->>FE: Toggle pin state / Write serial output
        FE->>User: Visually flash LED, update terminal logs
    end

    %% MQTT Telemetry Flow
    Note over FE, Sim: Telemetry Phase
    alt Mosquitto Broker active
        Sim->>FE: Publish telemetry (temp/humidity) via MQTT WS Bridge
        FE->>User: Plot live charts on Dashboard
    else Mosquitto Broker offline (Demo Mode)
        FE->>FE: Inject client-side noise/sine wave simulation
        FE->>User: Plot mock telemetry on Dashboard
    end
```

---


## 2. What is Mock/Demo Data?

To ensure a seamless development experience without requiring complex local hardware or system installations, the system automatically runs in a **Demo / Fallback Mode** when external dependencies are missing:

| Domain | Fallback Trigger | Behavior in Demo Mode |
| :--- | :--- | :--- |
| **Database** | MongoDB connection offline | The system runs on a transient **in-memory data store**. Projects and accounts can still be created, but data is cleared when the backend restarts. |
| **Code Compiler** | `arduino-cli` is not installed on the system PATH | The compilation endpoint intercepts the request, avoids throwing a shell execution error, logs a warning, and returns a static base64-encoded demo HEX string (`:00000001FF`) so the browser simulator can boot. |
| **Telemetry Feed** | Mosquitto MQTT Broker is offline | The frontend dashboard automatically switches to a client-side simulated data generator. It emits simulated sine/noise waves for temperature, humidity, and soil moisture (`aiot/device/*` topics) to show real-time charting. |
| **User Access** | Direct login bypass | The `/auth/demo` endpoint allows instant login with a pre-configured **Pro Tier** profile (unlimited workspace generations) without requiring an email verification flow. |

---

## 3. APIs Used in the Project

The system coordinates several API services to create the smart workspace:

1. **AI Reasoning & Generation APIs**:
   * **OpenRouter API** (`https://openrouter.ai/api/v1`): Serves as the Tier 1 Reasoning engine. Used to interpret natural language, extract components, and establish pin connections.
   * **NVIDIA AI API** (`https://integrate.api.nvidia.com/v1`): Serves as the Tier 2 Code Generator. It takes the circuit blueprint and outputs compiling-friendly C++/Python code.
   * **Groq API** (`https://api.groq.com/openai/v1`): Serves as the Tier 3 Validation engine. Evaluates the outputs, matches pin configurations against MCU constraints, and validates JSON formats.
2. **Local & Virtualized Hardware APIs**:
   * **avr8js**: A web-native execution engine that simulates AVR instruction sets directly in the browser's JavaScript environment.
   * **Express & Socket.IO**: Handles real-time WebSockets communication, updating serial outputs, compilation statuses, and telemetry.

---

## 4. AI Multi-Tier Routing Model

Rather than using a single model for every task (which is slow and expensive), AI IoT Astra leverages a **three-tier model architecture**:

```mermaid
stateDiagram-v2
    [*] --> Tier1 : User Prompts Description
    Tier1 --> Tier2 : Circuit Blueprint & Pins (JSON)
    Tier2 --> Tier3 : Raw Source Code (C++/MicroPython)
    Tier3 --> VerificationSuccess : Check Syntax & JSON Match
    Tier3 --> Tier1 : Syntax Fail (Self-Correction Loop)
    VerificationSuccess --> [*] : Render to UI Workspace
```

### Model Specifications

1. **Tier 1 (Reasoning Mode)**:
   * **Model**: `deepseek/deepseek-r1` (fallback: `google/gemma-4-31b-it`)
   * **Task**: Deep thinking. Evaluates how components interact (e.g. soil moisture sensor connects to Analog A0, relay pump to Digital D3).
2. **Tier 2 (CodeGen Mode)**:
   * **Model**: `google/gemma-4-31b-it` (fallback: `qwen/qwen-2.5-coder-32b`)
   * **Task**: Fast, precise syntax. Generates clean Arduino or MicroPython code block structured with proper initialization (`setup()`) and loop controls (`loop()`).
3. **Tier 3 (Validation Mode)**:
   * **Model**: `llama-3.3-70b-versatile` (via Groq)
   * **Task**: High-frequency JSON verification and code sanity check.

---

## 5. Next Steps: What You Need to Do More

To move from the simulated environment into a fully operational production setup, complete the following tasks:

### Task 1: Initialize Local Services via Docker
Start the dedicated database and messaging containers. Run this command in the project root:
```bash
docker-compose up mongodb mosquitto -d
```
* Once started, update the `backend/.env` file to point to the local instances:
  * `MONGODB_URI=mongodb://localhost:27017/ai-iot-astra`
  * `MQTT_BROKER_URL=mqtt://localhost:1883`

### Task 2: Install and Configure `arduino-cli`
To enable compilation of firmware code into real executables:
1. Download the [Arduino CLI](https://arduino.github.io/arduino-cli/latest/) binary.
2. Add the executable to your operating system's PATH.
3. Install the relevant platform cores:
   ```bash
   arduino-cli core update-index
   arduino-cli core install arduino:avr
   arduino-cli core install esp32:esp32
   ```

### Task 3: Setup Physical Hardware Deployments
1. Flash a physical board (e.g. ESP32 NodeMCU) using the generated code.
2. Configure the hardware client to connect to your Mosquitto broker IP.
3. Publish data on topics such as `aiot/device/temp` to watch the frontend charts update in real-time.

### Task 4: Set Up a Python Virtual Environment (`.venv`) for Firmware Tooling
Since flashing and compilation tools (such as **PlatformIO** and **esptool**) rely on Python packages, it is recommended to install them in a localized virtual environment:

1. **Create the Virtual Environment** in the project root:
   ```bash
   python -m venv .venv
   ```

2. **Activate the Virtual Environment**:
   * **Windows (PowerShell)**:
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
   * **Windows (CMD)**:
     ```cmd
     .venv\Scripts\activate.bat
     ```
   * **macOS / Linux**:
     ```bash
     source .venv/bin/activate
     ```

3. **Install Dependencies** using `requirements.txt`:
   ```bash
   pip install -r requirements.txt
   ```

4. **Verify Installation**:
   ```bash
   pio --version
   ```

