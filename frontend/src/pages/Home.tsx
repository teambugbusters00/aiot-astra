import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Monitor, Radio, ChevronRight, Cpu, GitBranch, Globe } from 'lucide-react';

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay },
});

const PLATFORMS = [
  { name: 'AVR / Arduino', sub: 'ATmega328P · avr8js sim',    color: '#E9A623' },
  { name: 'ESP32 / ESP8266', sub: 'Xtensa · QEMU esp fork',  color: '#378ADD' },
  { name: 'ARM Cortex-M',    sub: 'STM32 · nRF52 · Renode',  color: '#9B7AFF' },
  { name: 'RISC-V',          sub: 'ESP32-C3/C6 · QEMU riscv',color: '#1D9E75' },
  { name: 'MicroPython',     sub: 'ESP32 · RP2040 · WebREPL', color: '#639922' },
  { name: 'RPi / Linux SBC', sub: 'BCM2711 · Docker · SSH',  color: '#D85A30' },
];

const FEATURES = [
  { icon: Zap,      title: 'AI Code + Circuit',   desc: 'Natural language → firmware + schematic in seconds. Three-tier AI routing: reasoning, code, validation.' },
  { icon: Monitor,  title: 'Browser Simulation',  desc: 'avr8js runs ATmega328P at ~3M instructions/sec in-browser. Renode and QEMU for ARM, ESP32, RISC-V.' },
  { icon: Radio,    title: 'Live MQTT Dashboard', desc: 'Real ESP32 telemetry via Mosquitto → Socket.IO → React charts. Real-time from device to browser.' },
  { icon: ChevronRight, title: 'OTA Deployment', desc: 'PlatformIO compiles, espota.py flashes ESP wirelessly. USB and SSH deploy for other platforms.' },
  { icon: Cpu,      title: '6 IoT Platforms',     desc: 'Arduino, ESP32, STM32, RP2040, RISC-V, Raspberry Pi — one AI engine covers all.' },
  { icon: GitBranch, title: 'Project Manager',    desc: 'Save, clone, share, and version IoT projects. Full deployment history and collaboration support.' },
];

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      {/* Hero */}
      <section className="text-center mb-32">
        <motion.div {...fade(0)} className="font-ui text-xs font-semibold tracking-widest uppercase text-cyan flex items-center justify-center gap-4 mb-6">
          <span className="w-8 h-px bg-cyan/40" />
          Production Architecture · v1.0
          <span className="w-8 h-px bg-cyan/40" />
        </motion.div>

        <motion.h1 {...fade(0.1)} className="font-display font-black text-cyan animate-glow-text mb-6"
          style={{ fontSize: 'clamp(40px,8vw,80px)', lineHeight: 1 }}>
          AI IoT Astra
        </motion.h1>

        <motion.p {...fade(0.2)} className="font-ui text-lg italic text-slate-400 max-w-lg mx-auto mb-12">
          "Build, Simulate, and Deploy IoT Devices — Just by Talking to AI."
        </motion.p>

        <motion.div {...fade(0.3)} className="flex justify-center gap-2 flex-wrap mb-12">
          {[['6', 'IoT Platforms'], ['3', 'AI Model Tiers'], ['8', 'Backend Modules'], ['OTA', 'Deploy Ready']].map(([n, l]) => (
            <div key={l} className="bg-card border border-cyan/10 px-8 py-4 first:rounded-l last:rounded-r">
              <div className="font-display text-3xl text-cyan leading-none mb-1">{n}</div>
              <div className="font-ui text-xs uppercase tracking-wider text-slate-500">{l}</div>
            </div>
          ))}
        </motion.div>

        <motion.div {...fade(0.4)} className="flex justify-center gap-4 flex-wrap">
          <Link to="/workspace" className="btn-primary flex items-center gap-2">
            <Zap size={15} /> Start Building
          </Link>
          <Link to="/projects" className="btn-secondary flex items-center gap-2">
            <Globe size={15} /> View Projects
          </Link>
        </motion.div>
      </section>

      {/* Platforms */}
      <section className="mb-24">
        <h2 className="sec-title">All IoT Platforms</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {PLATFORMS.map((p, i) => (
            <motion.div key={p.name} {...fade(0.05 * i)}
              className="card border-t-2 p-4 text-center"
              style={{ borderTopColor: p.color }}>
              <div className="font-ui font-bold text-sm text-slate-200 mb-1">{p.name}</div>
              <div className="text-xs text-slate-500">{p.sub}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mb-24">
        <h2 className="sec-title">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={title} {...fade(0.06 * i)} className="card group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded bg-cyan/10 border border-cyan/20 flex items-center justify-center">
                  <Icon size={15} className="text-cyan" />
                </div>
                <div className="font-ui font-bold text-slate-200">{title}</div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Full pipeline */}
      <section>
        <h2 className="sec-title">Production Pipeline</h2>
        <div className="flex items-stretch gap-0 overflow-x-auto">
          {['Prompt', 'AI Router', 'Code + Circuit', 'Compile', 'Simulate', 'Deploy OTA', 'Monitor'].map((step, i) => (
            <div key={step} className="flex-1 min-w-[100px] flex flex-col items-center">
              <div className="font-display text-xs text-cyan mb-2">0{i + 1}</div>
              <div className={`w-full bg-card border border-cyan/10 border-t-2 border-t-cyan px-3 py-4 text-center font-ui font-semibold text-xs text-slate-200`}>
                {step}
              </div>
              {i < 6 && <div className="text-slate-600 text-xl mt-1 hidden md:block">›</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
