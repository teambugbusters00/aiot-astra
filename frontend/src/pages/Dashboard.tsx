import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Radio, Plus, Trash2, Activity, Wifi } from 'lucide-react';
import { useStore } from '../lib/store';
import { mqttAPI } from '../lib/api';
import { subscribeMQTT, publishMQTT } from '../hooks/useSocket';

interface ChartPoint { ts: string; value: number; }
type TopicData = Record<string, ChartPoint[]>;

const DEMO_TOPICS = ['aiot/device/temp', 'aiot/device/humidity', 'aiot/device/soil'];

export default function Dashboard() {
  const { mqttMessages, clearMqttMessages } = useStore();
  const [topics, setTopics]       = useState<string[]>(DEMO_TOPICS);
  const [newTopic, setNewTopic]   = useState('');
  const [chartData, setChartData] = useState<TopicData>({});
  const [mqttStatus, setMqttStatus] = useState<any>(null);
  const [pubTopic, setPubTopic]   = useState('');
  const [pubPayload, setPubPayload] = useState('');

  // Fetch MQTT status
  useEffect(() => {
    mqttAPI.status().then((r) => setMqttStatus(r.data)).catch(() => {});
  }, []);

  // Subscribe to initial topics
  useEffect(() => {
    topics.forEach((t) => subscribeMQTT(t));
  }, []);

  // Accumulate chart data from messages
  useEffect(() => {
    const last = mqttMessages[0];
    if (!last) return;
    const val = typeof last.payload === 'number' ? last.payload
      : typeof last.payload === 'object' ? Object.values(last.payload as any)[0] as number
      : parseFloat(last.payload);
    if (isNaN(val)) return;

    setChartData((prev) => {
      const existing = prev[last.topic] || [];
      const point = { ts: new Date(last.ts).toLocaleTimeString(), value: val };
      return { ...prev, [last.topic]: [...existing.slice(-60), point] };
    });
  }, [mqttMessages]);

  // Demo: inject simulated data when no real device
  useEffect(() => {
    const iv = setInterval(() => {
      if (mqttMessages.length === 0 || (mqttStatus && !mqttStatus.connected)) {
        const now = new Date().toLocaleTimeString();
        setChartData((prev) => {
          const next = { ...prev };
          DEMO_TOPICS.forEach((t, i) => {
            const base = [22, 55, 40][i];
            const val = +(base + (Math.random() - 0.5) * 6).toFixed(2);
            next[t] = [...(next[t] || []).slice(-60), { ts: now, value: val }];
          });
          return next;
        });
      }
    }, 2000);
    return () => clearInterval(iv);
  }, [mqttMessages.length, mqttStatus]);

  const addTopic = () => {
    if (!newTopic.trim() || topics.includes(newTopic)) return;
    subscribeMQTT(newTopic);
    mqttAPI.subscribe(newTopic).catch(() => {});
    setTopics((t) => [...t, newTopic]);
    setNewTopic('');
  };

  const removeTopic = (t: string) => {
    setTopics((prev) => prev.filter((x) => x !== t));
    setChartData((prev) => { const n = { ...prev }; delete n[t]; return n; });
  };

  const publish = async () => {
    if (!pubTopic || !pubPayload) return;
    publishMQTT(pubTopic, pubPayload);
    await mqttAPI.publish(pubTopic, pubPayload).catch(() => {});
    setPubPayload('');
  };

  const latestValues: Record<string, number> = {};
  for (const [topic, points] of Object.entries(chartData)) {
    latestValues[topic] = points[points.length - 1]?.value ?? 0;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h2 className="sec-title">Live IoT Dashboard</h2>

      {/* Status bar */}
      <div className="flex items-center gap-6 mb-8 p-4 bg-card border border-cyan/10 rounded">
        <div className="flex items-center gap-2">
          <Wifi size={14} className={mqttStatus?.connected ? 'text-green' : 'text-red'} />
          <span className="font-ui text-xs font-semibold uppercase">
            MQTT: {mqttStatus?.connected ? 'Connected' : 'Demo Mode'}
          </span>
        </div>
        <div className="text-xs text-slate-500">
          {topics.length} topics · {mqttMessages.length} messages received
        </div>
        {!mqttStatus?.connected && (
          <div className="text-xs text-amber/80 ml-auto">
            Demo data active — connect Mosquitto broker for real device data
          </div>
        )}
        <button onClick={clearMqttMessages} className="btn-ghost text-xs ml-auto flex items-center gap-1">
          <Trash2 size={12} /> Clear
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left sidebar — topic manager */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <div className="text-xs font-ui font-semibold uppercase text-cyan mb-3">Subscribe Topics</div>
            <div className="space-y-2 mb-4">
              {topics.map((t) => (
                <div key={t} className="flex items-center justify-between py-2 border-b border-cyan/5">
                  <div>
                    <div className="text-xs font-mono text-cyan truncate max-w-[140px]">{t}</div>
                    <div className="text-xs text-slate-600">{latestValues[t]?.toFixed(2) ?? '—'}</div>
                  </div>
                  <button onClick={() => removeTopic(t)} className="text-slate-600 hover:text-red transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newTopic} onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTopic()}
                placeholder="aiot/device/topic" className="input text-xs py-2 flex-1" />
              <button onClick={addTopic} className="btn-primary text-xs py-2 px-3">
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="card">
            <div className="text-xs font-ui font-semibold uppercase text-cyan mb-3">Publish</div>
            <input value={pubTopic} onChange={(e) => setPubTopic(e.target.value)}
              placeholder="topic" className="input text-xs py-2 mb-2" />
            <input value={pubPayload} onChange={(e) => setPubPayload(e.target.value)}
              placeholder="payload" className="input text-xs py-2 mb-3"
              onKeyDown={(e) => e.key === 'Enter' && publish()} />
            <button onClick={publish} className="btn-primary w-full text-xs py-2">Publish</button>
          </div>

          {/* Live message log */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-cyan/10">
              <Activity size={13} className="text-cyan" />
              <span className="font-ui text-xs font-semibold uppercase text-cyan">Messages</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse ml-auto" />
            </div>
            <div className="bg-bg font-mono text-xs p-3 h-48 overflow-y-auto space-y-1">
              {mqttMessages.slice(0, 30).map((m, i) => (
                <div key={i} className="border-b border-cyan/5 pb-1">
                  <span className="text-slate-600">{m.ts?.slice(11, 19)} </span>
                  <span className="text-cyan/70">{m.topic.split('/').pop()} </span>
                  <span className="text-green">{typeof m.payload === 'object' ? JSON.stringify(m.payload) : String(m.payload)}</span>
                </div>
              ))}
              {mqttMessages.length === 0 && <span className="text-slate-700">// Waiting for data...</span>}
            </div>
          </div>
        </div>

        {/* Right — Charts */}
        <div className="lg:col-span-3 space-y-4">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4">
            {DEMO_TOPICS.map((t, i) => {
              const labels = ['Temperature', 'Humidity', 'Soil Moisture'];
              const units  = ['°C', '%', '%'];
              const val    = latestValues[t];
              return (
                <div key={t} className="card border-t-2 border-t-cyan">
                  <div className="text-xs font-ui font-semibold uppercase text-slate-500 mb-1">{labels[i]}</div>
                  <div className="font-display text-3xl text-cyan mb-1">
                    {val !== undefined ? val.toFixed(1) : '—'}
                  </div>
                  <div className="text-xs text-slate-600">{units[i]} · live</div>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          {Object.entries(chartData).slice(0, 3).map(([topic, points]) => (
            <div key={topic} className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-ui font-bold text-sm text-slate-200">{topic}</div>
                  <div className="text-xs text-slate-500">{points.length} readings</div>
                </div>
                <span className="font-display text-xl text-cyan">{points[points.length - 1]?.value.toFixed(2)}</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={points}>
                  <defs>
                    <linearGradient id={`grad-${topic}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#00E5FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.05)" />
                  <XAxis dataKey="ts" tick={{ fontSize: 10, fill: '#5B8FAA' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#5B8FAA' }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    contentStyle={{ background: '#091827', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 4, fontSize: 12 }}
                    labelStyle={{ color: '#5B8FAA' }}
                    itemStyle={{ color: '#00E5FF' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#00E5FF" strokeWidth={2} fill={`url(#grad-${topic})`} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
