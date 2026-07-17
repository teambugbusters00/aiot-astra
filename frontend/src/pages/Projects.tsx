import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Plus, Copy, Trash2, ExternalLink, Cpu, Clock, Globe } from 'lucide-react';
import { projectsAPI } from '../lib/api';
import { useStore } from '../lib/store';
import { useNavigate } from 'react-router-dom';

const PLATFORM_COLORS: Record<string, string> = {
  uno: '#E9A623', mega: '#E9A623', esp32: '#378ADD',
  esp8266: '#378ADD', stm32: '#9B7AFF', rp2040: '#9B7AFF',
  micropython: '#639922', rpi: '#D85A30',
};

function ProjectCard({ project, onClone, onDelete, onOpen }: any) {
  const color = PLATFORM_COLORS[project.platform] || '#00E5FF';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card group hover:border-cyan/25 transition-all cursor-pointer"
      onClick={() => onOpen(project)}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-2 h-10 rounded-full mr-3 flex-shrink-0"
          style={{ background: color, boxShadow: `0 0 12px ${color}66` }}
        />
        <div className="flex-1 min-w-0">
          <div className="font-ui font-bold text-slate-200 truncate">{project.title}</div>
          <div className="text-xs text-slate-500 truncate mt-0.5">{project.description || project.prompt?.slice(0, 80)}</div>
        </div>
        <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onClone(project._id || project.id); }}
            className="p-1.5 text-slate-500 hover:text-cyan transition-colors"
          >
            <Copy size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(project._id || project.id); }}
            className="p-1.5 text-slate-500 hover:text-red transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <span className="tag tag-cyan text-xs">{project.platform}</span>
        {project.isPublic && (
          <span className="flex items-center gap-1 text-xs text-green">
            <Globe size={10} /> public
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-xs text-slate-600">
          <Cpu size={10} /> {project.components?.length || 0} components
        </span>
        <span className="flex items-center gap-1 text-xs text-slate-600">
          <Clock size={10} /> {new Date(project.createdAt || Date.now()).toLocaleDateString()}
        </span>
      </div>

      {project.deploymentHistory?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-cyan/5 text-xs text-slate-600">
          {project.deploymentHistory.length} deployment{project.deploymentHistory.length !== 1 ? 's' : ''} ·
          Last: {new Date(project.deploymentHistory.at(-1)?.timestamp).toLocaleDateString()}
        </div>
      )}
    </motion.div>
  );
}

export default function Projects() {
  const navigate = useNavigate();
  const { setActiveProject, user } = useStore();
  const [projects, setProjects]   = useState<any[]>([]);
  const [publicProjects, setPublicProjects] = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [tab, setTab]             = useState<'mine' | 'public'>('mine');
  const [search, setSearch]       = useState('');

  const load = async () => {
    setLoading(true);
    try {
      if (user) {
        const { data } = await projectsAPI.list();
        setProjects(data.projects || []);
      }
      const { data: pub } = await projectsAPI.public();
      setPublicProjects(pub.projects || []);
    } catch (err: any) {
      console.error('load projects:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const handleOpen = (project: any) => {
    setActiveProject(project);
    navigate('/workspace');
  };

  const handleClone = async (id: string) => {
    try {
      await projectsAPI.clone(id);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Clone failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    try {
      await projectsAPI.delete(id);
      setProjects((p) => p.filter((x) => (x._id || x.id) !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  };

  const displayed = (tab === 'mine' ? projects : publicProjects).filter((p) =>
    !search || p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.prompt?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="sec-title mb-0">Projects</h2>
        <button
          onClick={() => navigate('/workspace')}
          className="btn-primary flex items-center gap-2 text-xs"
        >
          <Plus size={14} /> New Project
        </button>
      </div>

      {/* Tabs + search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex border border-cyan/15 rounded overflow-hidden">
          {(['mine', 'public'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 font-ui text-xs font-semibold uppercase tracking-wider transition-all ${
                tab === t ? 'bg-cyan/15 text-cyan' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t === 'mine' ? 'My Projects' : 'Public'}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="input max-w-xs text-sm py-2"
        />
        <span className="text-xs text-slate-600 ml-auto">{displayed.length} projects</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-24 text-center">
          <FolderOpen size={48} className="text-cyan/20 mb-4" />
          <div className="font-ui text-slate-400 mb-2">
            {tab === 'mine' && !user ? 'Sign in to see your projects' : 'No projects yet'}
          </div>
          <div className="text-xs text-slate-600 mb-6">
            {tab === 'mine' ? 'Generate a project in the AI Workspace to get started' : 'No public projects found'}
          </div>
          {tab === 'mine' && (
            <button onClick={() => navigate('/workspace')} className="btn-primary text-xs py-2 px-4">
              Create First Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((p) => (
            <ProjectCard
              key={p._id || p.id}
              project={p}
              onOpen={handleOpen}
              onClone={handleClone}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
