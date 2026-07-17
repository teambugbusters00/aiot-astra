import { create } from 'zustand';

interface User { id: string; email: string; name: string; plan: string; generationsUsed: number; generationsLimit: number; userType?: string; institution?: string; }
interface Project { id: string; title: string; platform: string; components: any[]; code: string; diagram: any; prompt: string; mqttTopics?: any[]; description?: string; notes?: string; difficulty?: string; }

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;

  // Active project
  activeProject: Project | null;
  setActiveProject: (p: Project | null) => void;
  updateCode: (code: string) => void;

  // Generation state
  generating: boolean;
  setGenerating: (v: boolean) => void;

  // Simulation
  simSessionId: string | null;
  setSimSessionId: (id: string | null) => void;
  simRunning: boolean;
  setSimRunning: (v: boolean) => void;

  // MQTT live data
  mqttMessages: { topic: string; payload: any; ts: string }[];
  addMqttMessage: (msg: { topic: string; payload: any; ts: string }) => void;
  clearMqttMessages: () => void;

  // Serial log
  serialLog: string[];
  addSerialLine: (line: string) => void;
  clearSerial: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  token: localStorage.getItem('aiot_token'),
  setAuth: (user, token) => {
    localStorage.setItem('aiot_token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('aiot_token');
    set({ user: null, token: null, activeProject: null });
  },

  activeProject: null,
  setActiveProject: (p) => set({ activeProject: p }),
  updateCode: (code) => {
    const p = get().activeProject;
    if (p) set({ activeProject: { ...p, code } });
  },

  generating: false,
  setGenerating: (v) => set({ generating: v }),

  simSessionId: null,
  setSimSessionId: (id) => set({ simSessionId: id }),
  simRunning: false,
  setSimRunning: (v) => set({ simRunning: v }),

  mqttMessages: [],
  addMqttMessage: (msg) =>
    set((s) => ({ mqttMessages: [msg, ...s.mqttMessages].slice(0, 200) })),
  clearMqttMessages: () => set({ mqttMessages: [] }),

  serialLog: [],
  addSerialLine: (line) =>
    set((s) => ({ serialLog: [...s.serialLog, line].slice(-500) })),
  clearSerial: () => set({ serialLog: [] }),
}));
