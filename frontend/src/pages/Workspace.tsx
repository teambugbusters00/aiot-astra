import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { Zap, Copy, Save, ChevronRight, Cpu, Monitor, Check } from 'lucide-react';
import { useStore } from '../lib/store';
import { aiAPI, projectsAPI } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const PLATFORMS = [
  { value: 'uno',         label: 'Arduino Uno',    sub: 'ATmega328P' },
  { value: 'mega',        label: 'Arduino Mega',   sub: 'ATmega2560' },
  { value: 'esp32',       label: 'ESP32',          sub: 'Xtensa LX6' },
  { value: 'esp8266',     label: 'ESP8266',        sub: 'Xtensa LX106' },
  { value: 'stm32',       label: 'STM32',          sub: 'ARM Cortex-M3' },
  { value: 'rp2040',      label: 'RP2040',         sub: 'Dual Cortex-M0+' },
  { value: 'micropython', label: 'MicroPython',    sub: 'Python on MCU' },
  { value: 'rpi',         label: 'Raspberry Pi',   sub: 'Linux SBC' },
];

const EXAMPLES = [
  'Smart irrigation system with soil moisture sensor and relay pump',
  'Weather station with DHT22, BMP280, and OLED display',
  'Smart home gateway with relay, PIR sensor, and MQTT control',
  'Vehicle tracking with GPS Neo-6M and SIM800L GSM',
  'Industrial vibration monitor with ADXL345 and alerts',
];

export default function Workspace() {
  const { activeProject, setActiveProject, generating, setGenerating, user } = useStore();
  const navigate = useNavigate();

  const [prompt, setPrompt]       = useState('');
  const [platform, setPlatform]   = useState('uno');
  const [activeTab, setActiveTab] = useState<'code' | 'diagram' | 'components'>('code');
  const [error, setError]         = useState('');
  const [copied, setCopied]       = useState(false);
  const [saved, setSaved]         = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError('');
    try {
      const { data } = await aiAPI.generate(prompt, platform);
      setActiveProject(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const saveProject = async () => {
    if (!activeProject) return;
    try {
      await projectsAPI.create({
        title: activeProject.title || prompt.slice(0, 60),
        description: activeProject.description || '',
        prompt,
        platform,
        components: activeProject.components || [],
        diagram: activeProject.diagram || {},
        code: activeProject.code || '',
        mqttTopics: activeProject.mqttTopics || [],
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Save failed');
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(activeProject?.code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h2 className="sec-title">AI Prompt Workspace</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Prompt Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <label className="block text-xs font-ui font-semibold uppercase tracking-widest text-cyan mb-3">
              Platform
            </label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="select mb-4">
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label} — {p.sub}</option>
              ))}
            </select>

            <label className="block text-xs font-ui font-semibold uppercase tracking-widest text-cyan mb-3">
              Describe your IoT project
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') generate(); }}
              placeholder="e.g. Smart irrigation system with soil moisture sensor, relay pump, and MQTT dashboard..."
              rows={7}
              className="input resize-none"
            />
            <div className="text-xs text-slate-600 mt-1">Ctrl+Enter to generate</div>

            <button
              onClick={generate}
              disabled={generating || !prompt.trim()}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <span className="w-4 h-4 border-2 border-bg/40 border-t-bg rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <><Zap size={15} /> Generate</>
              )}
            </button>

            {error && (
              <div className="mt-3 p-3 bg-red/10 border border-red/30 rounded text-red text-xs">
                {error}
              </div>
            )}
          </div>

          {/* Example prompts */}
          <div className="card">
            <div className="text-xs font-ui font-semibold uppercase tracking-wider text-slate-500 mb-3">Examples</div>
            <ul className="space-y-2">
              {EXAMPLES.map((ex) => (
                <li key={ex}>
                  <button
                    onClick={() => setPrompt(ex)}
                    className="w-full text-left text-xs text-slate-400 hover:text-cyan transition-colors leading-relaxed flex items-start gap-2"
                  >
                    <ChevronRight size={12} className="shrink-0 mt-0.5 text-cyan/50" />
                    {ex}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Components list */}
          {(activeProject?.components?.length ?? 0) > 0 && (
            <div className="card">
              <div className="text-xs font-ui font-semibold uppercase tracking-wider text-cyan mb-3 flex items-center gap-2">
                <Cpu size={12} /> Components
              </div>
              <ul className="space-y-2">
                {activeProject?.components?.map((c: any, i: number) => (
                  <li key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-mono">{c.type}</span>
                    <span className="text-slate-500">pin {c.pin ?? '—'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right — Code / Output */}
        <div className="lg:col-span-2">
          {activeProject ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-0 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-cyan/10">
                <div>
                  <div className="font-ui font-bold text-slate-200">{activeProject.title}</div>
                  <div className="text-xs text-slate-500">{activeProject.platform} · {activeProject.difficulty}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {(['code', 'diagram', 'components'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 font-ui text-xs font-semibold uppercase tracking-wider transition-all ${
                          activeTab === tab ? 'bg-cyan/15 text-cyan' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <button onClick={copy} className="btn-ghost flex items-center gap-1 text-xs">
                    {copied ? <Check size={13} className="text-green" /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  {user && (
                    <button onClick={saveProject} className="btn-ghost flex items-center gap-1 text-xs">
                      {saved ? <Check size={13} className="text-green" /> : <Save size={13} />}
                      {saved ? 'Saved' : 'Save'}
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/simulation')}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <Monitor size={13} /> Simulate
                  </button>
                </div>
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                {activeTab === 'code' && (
                  <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Editor
                      height="60vh"
                      language={activeProject.platform === 'micropython' || activeProject.platform === 'rpi' ? 'python' : 'cpp'}
                      value={activeProject.code || '// No code generated'}
                      theme="vs-dark"
                      options={{
                        fontSize: 13,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontFamily: 'Share Tech Mono, monospace',
                        lineNumbers: 'on',
                        readOnly: false,
                      }}
                      onChange={(val) => val && useStore.getState().updateCode(val)}
                    />
                  </motion.div>
                )}

                {activeTab === 'diagram' && (
                  <motion.div key="diagram" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="p-6 min-h-96">
                    <pre className="text-xs text-slate-400 overflow-auto max-h-96">
                      {JSON.stringify(activeProject.diagram, null, 2)}
                    </pre>
                  </motion.div>
                )}

                {activeTab === 'components' && (
                  <motion.div key="components" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="p-6 min-h-96">
                    <div className="grid grid-cols-2 gap-3">
                      {(activeProject.components || []).map((c: any, i: number) => (
                        <div key={i} className="bg-surface border border-cyan/10 rounded p-3">
                          <div className="font-ui font-bold text-sm text-slate-200 mb-1">{c.type}</div>
                          {c.label && <div className="text-xs text-cyan mb-1">{c.label}</div>}
                          <div className="text-xs text-slate-500">
                            {c.pin !== undefined && `Pin: ${c.pin}`}
                            {c.color && ` · ${c.color}`}
                          </div>
                        </div>
                      ))}
                    </div>
                    {(activeProject?.mqttTopics?.length ?? 0) > 0 && (
                      <div className="mt-6">
                        <div className="text-xs font-ui font-semibold uppercase text-cyan mb-3">MQTT Topics</div>
                        {activeProject?.mqttTopics?.map((t: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 py-2 border-b border-cyan/5 text-xs">
                            <span className={`tag ${t.direction === 'publish' ? 'tag-green' : 'tag-amber'}`}>
                              {t.direction}
                            </span>
                            <span className="font-mono text-cyan">{t.topic}</span>
                            <span className="text-slate-500">{t.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="card flex flex-col items-center justify-center min-h-96 text-center">
              {generating ? (
                <>
                  <div className="w-16 h-16 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin mb-6" />
                  <div className="font-ui font-bold text-cyan mb-2">Generating your IoT project...</div>
                  <div className="text-xs text-slate-500">AI is planning circuit, generating firmware, validating pins</div>
                </>
              ) : (
                <>
                  <Zap size={48} className="text-cyan/20 mb-4" />
                  <div className="font-ui text-slate-400 mb-2">Describe your IoT project on the left</div>
                  <div className="text-xs text-slate-600">AI will generate circuit + firmware + MQTT config</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


