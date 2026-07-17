import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Workspace from './pages/Workspace';
import Simulation from './pages/Simulation';
import Deployment from './pages/Deployment';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Login from './pages/Login';
import { useSocket } from './hooks/useSocket';
import { useStore } from './lib/store';
import { authAPI } from './lib/api';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useStore();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppShell() {
  useSocket();
  const { token, setAuth, logout } = useStore();

  useEffect(() => {
    if (!token) return;
    authAPI.me()
      .then((r) => setAuth(r.data, token))
      .catch(() => logout());
  }, []);

  return (
    <BrowserRouter>
      <Navbar />
      <main className="min-h-screen">
        <Routes>
          <Route path="/"           element={<Home />} />
          <Route path="/workspace"  element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
          <Route path="/simulation" element={<ProtectedRoute><Simulation /></ProtectedRoute>} />
          <Route path="/deploy"     element={<ProtectedRoute><Deployment /></ProtectedRoute>} />
          <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/projects"   element={<ProtectedRoute><Projects /></ProtectedRoute>} />
          <Route path="/login"      element={<Login />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default function App() {
  return <AppShell />;
}
