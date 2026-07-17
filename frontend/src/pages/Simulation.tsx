import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, RotateCcw, Terminal, Cpu, Zap } from 'lucide-react';
import { useStore } from '../lib/store';
import { simAPI } from '../lib/api';
import { joinSimulation } from '../hooks/useSocket';
import { getSocket } from '../hooks/useSocket';
import SimCanvas from '../simulator/canvas/SimCanvas';

// ── Virtual LED ───────────────────────────────────────────────────
function VirtualLED({ label, pin, active, color = 'red' }: { label: string; pin: number; active: boolean; color?: string }) {
  const colors: Record<string, string> = {
    red: '#FF4455', green: '#00FF88', blue: '#3B82F6',
    yellow: '#FFB800', white: '#E2E8F0', cyan: '#00E5FF',
  };
  const c = colors[color] || colors.red;
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-8 h-8 rounded-full border-2 transition-all duration-100"
        style={{
          background: active ? c : '#111',
          borderColor: active ? c : '#333',
          boxShadow: active ? `0 0 16px ${c}, 0 0 32px ${c}66` : 'none',
        }}
      />
      <div className="text-xs text-slate-500 font-mono">{label}</div>
      <div className="text-xs text-slate-600">P{pin}</div>
    </div>
  );
}

// ── Virtual Button ────────────────────────────────────────────────
function VirtualButton({ label, pin, onPress, onRelease }: { label: string; pin: number; onPress: () => void; onRelease: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onMouseDown={onPress} onMouseUp={onRelease}
        onTouchStart={onPress} onTouchEnd={onRelease}
        className="w-12 h-12 rounded-full border-2 border-cyan/40 bg-surface hover:bg-cyan/10
          active:bg-cyan/20 active:scale-95 transition-all font-mono text-xs text-cyan"
      >
        BTN
      </button>
      <div className="text-xs text-slate-500 font-mono">{label}</div>
      <div className="text-xs text-slate-600">P{pin}</div>
    </div>
  );
}

// ── Virtual Potentiometer ─────────────────────────────────────────
function VirtualPot({ label, pin, value, onChange }: { label: string; pin: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 font-mono">{label} (P{pin})</span>
        <span className="text-xs text-cyan font-mono">{value}</span>
      </div>
      <input
        type="range" min={0} max={1023} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cyan h-1"
      />
    </div>
  );
}

// ── Pin waveform display ──────────────────────────────────────────
function PinWave({ pin, value }: { pin: number; value: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="font-mono text-xs text-slate-500 w-12">D{pin}</span>
      <div className={`flex-1 h-2 rounded-full transition-all duration-100 ${value ? 'bg-cyan' : 'bg-slate-800'}`} />
      <span className={`font-mono text-xs w-8 ${value ? 'text-cyan' : 'text-slate-600'}`}>{value ? 'HIGH' : 'LOW'}</span>
    </div>
  );
}

export default function Simulation() {
  const { activeProject, simSessionId, setSimSessionId, simRunning, setSimRunning, serialLog, addSerialLine, clearSerial } = useStore();
  const [compiling, setCompiling]     = useState(false);
  const [compileErr, setCompileErr]   = useState('');
  const [pinStates, setPinStates]     = useState<Record<string, boolean | number>>({});
  const [potValues, setPotValues]     = useState<Record<string, number>>({});
  const serialRef                     = useRef<HTMLDivElement>(null);

  // auto-scroll serial
  useEffect(() => {
    if (serialRef.current) serialRef.current.scrollTop = serialRef.current.scrollHeight;
  }, [serialLog]);

  // Socket pin updates
  useEffect(() => {
    const s = getSocket();
    s.on('pin:update', ({ pin, value }: { pin: string | number; value: boolean | number }) => {
      setPinStates((p) => ({ ...p, [String(pin)]: value }));
    });
    s.on('serial:data', ({ data }: { data: string }) => addSerialLine(data));
    return () => { s.off('pin:update'); s.off('serial:data'); };
  }, []);

  const startSimulation = useCallback(async () => {
    if (!activeProject) return;
    setCompiling(true);
    setCompileErr('');
    try {
      // Compile to hex
      const { data: compiled } = await simAPI.compile(activeProject.code, activeProject.platform);
      if (!compiled.success) { setCompileErr(compiled.error || 'Compile failed'); return; }

      // Create session
      const { data: session } = await simAPI.create({
        projectId: activeProject.id,
        platform: activeProject.platform,
        components: activeProject.components,
        hexBase64: compiled.hexBase64,
      });

      setSimSessionId(session.id);
      joinSimulation(session.id);
      setSimRunning(true);
      addSerialLine(`[SIM] Session started: ${session.id}`);
      addSerialLine(`[SIM] Platform: ${activeProject.platform} | Components: ${activeProject.components?.length || 0}`);
      if (compiled.demo) addSerialLine('[SIM] Demo mode — install arduino-cli for real compilation');
    } catch (err: any) {
      setCompileErr(err.response?.data?.error || err.message);
    } finally {
      setCompiling(false);
    }
  }, [activeProject]);

  const stopSimulation = async () => {
    if (simSessionId) { await simAPI.delete(simSessionId).catch(() => {}); }
    setSimRunning(false);
    setSimSessionId(null);
    addSerialLine('[SIM] Simulation stopped');
  };

  const injectPin = async (pin: number, value: boolean) => {
    if (!simSessionId) return;
    await simAPI.setPin(simSessionId, pin, value ? 1 : 0).catch(() => {});
    const s = getSocket();
    s.emit('pin:set', { sessionId: simSessionId, pin, value });
  };

  const leds = activeProject?.components?.filter((c: any) => c.type === 'led') || [];
  const buttons = activeProject?.components?.filter((c: any) => c.type === 'button') || [];
  const pots = activeProject?.components?.filter((c: any) => c.type === 'potentiometer') || [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h2 className="sec-title">Simulation Engine</h2>

      {!activeProject ? (
        <div className="card flex flex-col items-center justify-center min-h-64 text-center">
          <Cpu size={48} className="text-cyan/20 mb-4" />
          <div className="font-ui text-slate-400 mb-2">No project loaded</div>
          <div className="text-xs text-slate-600">Generate a project in the AI Workspace first</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — Virtual Circuit */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              {/* Controls */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="font-ui font-bold text-slate-200">{activeProject.title}</div>
                  <div className="text-xs text-slate-500 font-mono">{activeProject.platform}</div>
                </div>
                <div className="flex gap-2">
                  {!simRunning ? (
                    <button onClick={startSimulation} disabled={compiling}
                      className="btn-primary flex items-center gap-2 disabled:opacity-40">
                      {compiling
                        ? <><span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" /> Compiling...</>
                        : <><Play size={14} /> Start Sim</>}
                    </button>
                  ) : (
                    <button onClick={stopSimulation} className="bg-red/20 border border-red/40 text-red font-ui text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-sm flex items-center gap-2">
                      <Square size={14} /> Stop
                    </button>
                  )}
                  <button onClick={() => { stopSimulation(); clearSerial(); }} className="btn-ghost flex items-center gap-1">
                    <RotateCcw size={13} /> Reset
                  </button>
                </div>
              </div>

              {compileErr && (
                <div className="mb-4 p-3 bg-red/10 border border-red/30 rounded text-red text-xs font-mono">
                  {compileErr}
                </div>
              )}

              {/* Status banner */}
              {simRunning && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-2 mb-6 px-4 py-2 bg-green/10 border border-green/30 rounded">
                  <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
                  <span className="text-green font-ui text-xs font-semibold">SIMULATION RUNNING</span>
                  <span className="text-slate-500 text-xs ml-auto">avr8js · {activeProject.platform}</span>
                </motion.div>
              )}

              {/* Interactive Visual Canvas */}
              <div className="mt-4">
                <SimCanvas
                  platform={activeProject.platform}
                  components={activeProject.components || []}
                  pinStates={pinStates}
                />
              </div>

              {/* Digital Twin Controls (Sliders) */}
              {pots.length > 0 && (
                <div className="mt-6 pt-6 border-t border-cyan/10">
                  <div className="text-xs font-ui font-semibold uppercase text-cyan/70 mb-4">Digital Twin Inputs (Sliders)</div>
                  <div className="space-y-4">
                    {pots.map((pot: any, i: number) => (
                      <VirtualPot key={i}
                        label={pot.label || `POT ${i + 1}`}
                        pin={pot.pin || 'A0'}
                        value={Number(pinStates[pot.pin || 'A0'] || 512)}
                        onChange={(v) => {
                          setPinStates((p) => ({ ...p, [pot.pin || 'A0']: v }));
                          if (simSessionId) {
                            getSocket().emit('pin:set', { sessionId: simSessionId, pin: pot.pin || 'A0', value: v });
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right — Serial Monitor */}
          <div className="space-y-4">
            <div className="card p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-cyan/10">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-cyan" />
                  <span className="font-ui text-xs font-semibold uppercase tracking-wider text-cyan">Serial Monitor</span>
                </div>
                <div className="flex items-center gap-2">
                  {simRunning && <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />}
                  <button onClick={clearSerial} className="text-slate-600 hover:text-slate-400 text-xs">Clear</button>
                </div>
              </div>
              <div ref={serialRef}
                className="bg-bg font-mono text-xs p-4 h-96 overflow-y-auto text-green/80 leading-relaxed">
                {serialLog.length === 0
                  ? <span className="text-slate-700">// Serial output will appear here...</span>
                  : serialLog.map((line, i) => <div key={i}>{line}</div>)
                }
              </div>
              <div className="px-4 py-3 border-t border-cyan/10">
                <input
                  type="text"
                  placeholder="Send command..."
                  className="input text-xs py-2"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && simSessionId) {
                      const val = (e.target as HTMLInputElement).value;
                      await simAPI.sendSerial(simSessionId, val);
                      addSerialLine(`> ${val}`);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </div>
            </div>

            {/* Sim info */}
            <div className="card">
              <div className="text-xs font-ui font-semibold uppercase text-cyan/70 mb-3">Simulation Info</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Engine</span><span className="text-cyan">avr8js</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Speed</span><span className="text-slate-300">~3M inst/sec</span></div>
                <div className="flex justify-between"><span className="text-slate-500">FPS</span><span className="text-slate-300">~60 fps</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Platform</span><span className="text-slate-300">{activeProject.platform}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Components</span><span className="text-slate-300">{activeProject.components?.length || 0}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Session</span><span className="font-mono text-slate-400 text-xs">{simSessionId?.slice(0, 12) || '—'}...</span></div>
              </div>
            </div>

            {/* Notes */}
            {activeProject.notes && (
              <div className="card border-l-2 border-l-amber">
                <div className="text-xs font-ui font-semibold uppercase text-amber mb-2">Notes</div>
                <p className="text-xs text-slate-400 leading-relaxed">{activeProject.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
