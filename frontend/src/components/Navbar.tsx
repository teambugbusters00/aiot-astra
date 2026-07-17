import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cpu, Zap, Monitor, Radio, FolderOpen, LogOut, User, ChevronRight } from 'lucide-react';
import { useStore } from '../lib/store';

const NAV = [
  { path: '/',           label: 'Home',        icon: Cpu },
  { path: '/workspace',  label: 'Workspace',   icon: Zap },
  { path: '/simulation', label: 'Simulation',  icon: Monitor },
  { path: '/deploy',     label: 'Deploy',      icon: ChevronRight },
  { path: '/dashboard',  label: 'Dashboard',   icon: Radio },
  { path: '/projects',   label: 'Projects',    icon: FolderOpen },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useStore();

  return (
    <nav className="sticky top-0 z-50 bg-bg/90 backdrop-blur-xl border-b border-cyan/10">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <Link to="/" className="font-display text-cyan text-sm tracking-widest animate-glow-text">
          AI IoT Astra
        </Link>

        {/* Links */}
        <ul className="flex items-center gap-1">
          {NAV.map(({ path, label, icon: Icon }) => {
            const active = pathname === path || (path !== '/' && pathname.startsWith(path));
            return (
              <li key={path}>
                <Link
                  to={path}
                  className={`flex items-center gap-2 px-4 py-2 rounded font-ui text-xs font-semibold uppercase tracking-wider transition-all ${
                    active ? 'bg-cyan/10 text-cyan' : 'text-slate-400 hover:text-cyan hover:bg-cyan/5'
                  }`}
                >
                  <Icon size={13} />
                  {label}
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-0 right-0 h-px bg-cyan"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* User */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 border border-cyan/15 rounded bg-surface">
                <User size={13} className="text-cyan" />
                <span className="font-ui text-xs text-slate-300">{user.name}</span>
                <span className={`text-xs font-display ${user.plan === 'free' ? 'text-slate-500' : 'text-cyan'}`}>
                  [{user.plan.toUpperCase()}{user.userType ? ` · ${user.userType === 'student' ? `Student @ ${user.institution || 'Univ'}` : 'Professional'}` : ''}]
                </span>
              </div>
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="p-2 text-slate-500 hover:text-red transition-colors"
              >
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-primary text-xs py-2 px-4">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
