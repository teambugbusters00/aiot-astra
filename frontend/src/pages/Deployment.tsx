import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, Usb, Terminal, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { deployAPI } from '../lib/api';
import { useStore } from '../lib/store';
import { getSocket } from '../hooks/useSocket';

type Method = 'ota' | 'usb' | 'ssh';

export default function Deployment() {
  const { activeProject, serialLog, addSerialLine } = useStore();
  const [method, setMethod] = useState<Method>('ota');
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // OTA fields
  const [deviceIp, setDeviceIp] = useState('');
  const [otaPort, setOtaPort]   = useState('3232');

  // USB fields
  const [serialPort, setSerialPort] = useState('/dev/ttyUSB0');

  // SSH fields
  const [host, setHost]         = useState('');
  const [sshUser, setSshUser]   = useState('pi');
  const [sshPass, setSshPass]   = useState('');

  const appendLog = (line: string) => {
    setLogs((l) => [...l, line]);
    addSerialLine(line);
  };

  // Listen for deploy logs via socket
  useState(() => {
    const s = getSocket();
    s.on('deploy:log', ({ line }: { line: string }) => appendLog(line));
    return () => { s.off('deploy:log'); };
  });

  const deploy = async () => {
    if (!activeProject?.code) return;
    setDeploying(true);
    setLogs([]);
    setResult(null);
    appendLog(`[START] Deploying via ${method.toUpperCase()}...`);

    try {
      // Step 1 — compile firmware to hex
      appendLog('[INFO] Compiling firmware...');
      const compileResp = await fetch('/simulation/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('aiot_token') || ''}`,
        },
        body: JSON.stringify({ code: activeProject.code, platform: activeProject.platform }),
      });
      const compiled = await compileResp.json();
      appendLog(`[INFO] Compile ${compiled.success ? 'OK' : 'FAILED (demo mode)'}${compiled.demo ? ' — demo hex' : ''}`);

      // Step 2 — deploy via chosen method
      let resp;
      if (method === 'ota') {
        resp = await deployAPI.ota({ deviceIp, port: Number(otaPort), hexBase64: compiled.hexBase64, platform: activeProject.platform });
      } else if (method === 'usb') {
        resp = await deployAPI.usb({ port: serialPort, hexBase64: compiled.hexBase64, platform: activeProject.platform });
      } else {
        resp = await deployAPI.ssh({ host, username: sshUser, password: sshPass, code: activeProject.code });
      }
      setResult(resp.data);
      (resp.data.logs || []).forEach((l: string) => appendLog(l));
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      appendLog(`[ERROR] ${msg}`);
      if (err.response?.data?.manualCmd) appendLog(`[HINT] Manual: ${err.response.data.manualCmd}`);
      setResult({ success: false, error: msg });
    } finally {
      setDeploying(false);
    }
  };

  const METHODS = [
    { id: 'ota' as Method, label: 'OTA WiFi',  icon: Wifi,     desc: 'espota.py over WiFi (ESP32/ESP8266)' },
    { id: 'usb' as Method, label: 'USB Flash', icon: Usb,      desc: 'arduino-cli serial flash' },
    { id: 'ssh' as Method, label: 'SSH Deploy', icon: Terminal, desc: 'Python/Linux SBC via SSH' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h2 className="sec-title">OTA Deployment</h2>

      {!activeProject ? (
        <div className="card flex flex-col items-center justify-center min-h-64 text-center">
          <ChevronRight size={48} className="text-cyan/20 mb-4" />
          <div className="font-ui text-slate-400 mb-2">No project loaded</div>
          <div className="text-xs text-slate-600">Generate a project in the AI Workspace first</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Config panel */}
          <div className="space-y-4">
            {/* Method selector */}
            <div className="card">
              <div className="text-xs font-ui font-semibold uppercase text-cyan mb-4">Deploy Method</div>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map(({ id, label, icon: Icon, desc }) => (
                  <button key={id} onClick={() => setMethod(id)}
                    className={`p-4 rounded border text-center transition-all ${
                      method === id ? 'border-cyan/50 bg-cyan/10' : 'border-cyan/10 hover:border-cyan/25'
                    }`}>
                    <Icon size={20} className={`mx-auto mb-2 ${method === id ? 'text-cyan' : 'text-slate-500'}`} />
                    <div className={`font-ui font-bold text-xs ${method === id ? 'text-cyan' : 'text-slate-400'}`}>{label}</div>
                    <div className="text-xs text-slate-600 mt-1">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Method-specific fields */}
            <div className="card">
              <div className="text-xs font-ui font-semibold uppercase text-cyan mb-4">Configuration</div>
              <AnimatePresence mode="wait">
                {method === 'ota' && (
                  <motion.div key="ota" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Device IP Address</label>
                      <input value={deviceIp} onChange={(e) => setDeviceIp(e.target.value)}
                        placeholder="192.168.1.100" className="input" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">OTA Port</label>
                      <input value={otaPort} onChange={(e) => setOtaPort(e.target.value)}
                        placeholder="3232" className="input" />
                    </div>
                    <div className="text-xs text-slate-600 p-3 bg-surface rounded border border-cyan/5">
                      Requires <span className="text-cyan">espota.py</span> (pip install esptool) and OTA enabled in firmware.
                    </div>
                  </motion.div>
                )}
                {method === 'usb' && (
                  <motion.div key="usb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Serial Port</label>
                      <input value={serialPort} onChange={(e) => setSerialPort(e.target.value)}
                        placeholder="/dev/ttyUSB0 or COM3" className="input" />
                    </div>
                    <div className="text-xs text-slate-600 p-3 bg-surface rounded border border-cyan/5">
                      Requires <span className="text-cyan">arduino-cli</span> installed and board core for {activeProject.platform}.
                    </div>
                  </motion.div>
                )}
                {method === 'ssh' && (
                  <motion.div key="ssh" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Host</label>
                      <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="raspberrypi.local" className="input" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Username</label>
                      <input value={sshUser} onChange={(e) => setSshUser(e.target.value)} placeholder="pi" className="input" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Password</label>
                      <input value={sshPass} onChange={(e) => setSshPass(e.target.value)} type="password" className="input" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button onClick={deploy} disabled={deploying}
                className="btn-primary w-full mt-6 flex items-center justify-center gap-2 disabled:opacity-40">
                {deploying
                  ? <><span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" /> Deploying...</>
                  : <><ChevronRight size={15} /> Deploy to Device</>}
              </button>

              {result && (
                <div className={`mt-4 p-3 rounded border flex items-center gap-2 text-sm ${
                  result.success ? 'bg-green/10 border-green/30 text-green' : 'bg-red/10 border-red/30 text-red'
                }`}>
                  {result.success ? <Check size={14} /> : <AlertCircle size={14} />}
                  {result.success ? 'Deploy successful!' : result.error}
                </div>
              )}
            </div>
          </div>

          {/* Deploy log */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-cyan/10">
              <Terminal size={14} className="text-cyan" />
              <span className="font-ui text-xs font-semibold uppercase text-cyan">Deploy Log</span>
              {deploying && <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse ml-auto" />}
            </div>
            <div className="bg-bg font-mono text-xs p-4 h-96 overflow-y-auto text-green/80 leading-relaxed">
              {logs.length === 0
                ? <span className="text-slate-700">// Deploy log will appear here...</span>
                : logs.map((l, i) => (
                  <div key={i} className={
                    l.includes('[ERROR]') || l.includes('[FAIL]') ? 'text-red' :
                    l.includes('[OK]') || l.includes('success') ? 'text-green' :
                    l.includes('[WARN]') ? 'text-amber' : 'text-green/70'
                  }>{l}</div>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
