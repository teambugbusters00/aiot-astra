import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../lib/api';
import { useStore } from '../lib/store';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useStore();

  const [mode, setMode]           = useState<'login' | 'register'>('login');
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [userType, setUserType]   = useState<'student' | 'professional'>('professional');
  const [institution, setInstitution] = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      let data;
      if (mode === 'login') {
        ({ data } = await authAPI.login(email, password));
      } else {
        ({ data } = await authAPI.register(name, email, password, userType, institution));
      }
      setAuth(data.user, data.token);
      navigate('/workspace');
    } catch (err: any) {
      const errMsg = err.response?.data?.error;
      if (typeof errMsg === 'string') {
        setError(errMsg);
      } else if (errMsg && typeof errMsg === 'object' && (errMsg as any).message) {
        setError((errMsg as any).message);
      } else {
        setError(err.response?.data?.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async () => {
    setLoading(true);
    try {
      const { data } = await authAPI.demo();
      setAuth(data.user, data.token);
      navigate('/workspace');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="font-display text-cyan text-2xl tracking-widest animate-glow-text">
            AI IoT Astra
          </Link>
          <p className="text-xs text-slate-500 mt-2 font-ui uppercase tracking-wider">
            Build · Simulate · Deploy
          </p>
        </div>

        {/* Card */}
        <div className="card p-8">
          {/* Tabs */}
          <div className="flex border border-cyan/15 rounded overflow-hidden mb-8">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setMode(t); setError(''); }}
                className={`flex-1 py-2.5 font-ui text-xs font-semibold uppercase tracking-wider transition-all ${
                  mode === t ? 'bg-cyan/15 text-cyan' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {mode === 'register' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                <div>
                  <label className="block text-xs font-ui font-semibold uppercase tracking-wider text-slate-500 mb-2">Name</label>
                  <input
                    value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Your name" className="input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-ui font-semibold uppercase tracking-wider text-slate-500 mb-2">Are you a...</label>
                  <select
                    value={userType} onChange={(e) => setUserType(e.target.value as any)}
                    className="input bg-bg border border-cyan/15 rounded w-full p-2.5 text-slate-300 font-ui text-xs"
                  >
                    <option value="professional">Working Professional</option>
                    <option value="student">Student</option>
                  </select>
                </div>

                {userType === 'student' && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <label className="block text-xs font-ui font-semibold uppercase tracking-wider text-slate-500 mb-2">University / School Name</label>
                    <input
                      value={institution} onChange={(e) => setInstitution(e.target.value)}
                      placeholder="e.g. Stanford University" className="input"
                    />
                  </motion.div>
                )}
              </motion.div>
            )}

            <div>
              <label className="block text-xs font-ui font-semibold uppercase tracking-wider text-slate-500 mb-2">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" className="input"
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </div>

            <div>
              <label className="block text-xs font-ui font-semibold uppercase tracking-wider text-slate-500 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" className="input pr-10"
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                />
                <button
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red/10 border border-red/30 rounded text-red text-xs">
                {error}
              </div>
            )}

            <button
              onClick={submit} disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 mt-2"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                : <Zap size={14} />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>


        </div>
      </motion.div>
    </div>
  );
}
