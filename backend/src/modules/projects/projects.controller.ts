import { Request, Response } from 'express';
import { Project } from './projects.model';
import { logger } from '../../config/logger';
import { v4 as uuid } from 'uuid';
import zlib from 'zlib';

// In-memory store when MongoDB is unavailable
const memStore = new Map<string, any>();

function decompressProject(project: any): any {
  if (!project) return project;
  const doc = typeof project.toObject === 'function' ? project.toObject() : project;
  if (doc.code && doc.code.startsWith('gzipped:')) {
    try {
      const base64Data = doc.code.substring('gzipped:'.length);
      doc.code = zlib.gunzipSync(Buffer.from(base64Data, 'base64')).toString('utf-8');
    } catch (e: any) {
      logger.error('failed to decompress code:', e.message);
    }
  }
  return doc;
}

async function saveProject(data: any): Promise<any> {
  const toSave = { ...data };
  if (toSave.code) {
    try {
      toSave.code = 'gzipped:' + zlib.gzipSync(toSave.code).toString('base64');
    } catch (e: any) {
      logger.error('failed to compress code:', e.message);
    }
  }
  try {
    const p = new Project(toSave);
    const saved = await p.save();
    return decompressProject(saved);
  } catch {
    const id = uuid();
    const record = { ...toSave, _id: id, id, createdAt: new Date(), updatedAt: new Date() };
    memStore.set(id, record);
    return decompressProject(record);
  }
}

async function findProjects(query: object): Promise<any[]> {
  try {
    const list = await Project.find(query).sort({ createdAt: -1 }).limit(50).lean();
    return list.map(decompressProject);
  } catch {
    return Array.from(memStore.values()).map(decompressProject);
  }
}

async function findProjectById(id: string): Promise<any> {
  try {
    const project = await Project.findById(id).lean();
    return decompressProject(project);
  } catch {
    return decompressProject(memStore.get(id));
  }
}

export const createProject = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { title, description, prompt, platform, components, diagram, code, mqttTopics, tags } = req.body;
    if (!title || !prompt || !platform)
      return res.status(400).json({ error: 'title, prompt, platform required' });

    const project = await saveProject({
      userId,
      title,
      description: description || '',
      prompt,
      platform,
      components: components || [],
      diagram: diagram || {},
      code: code || '',
      mqttTopics: mqttTopics || [],
      tags: tags || [],
      isPublic: false,
      deploymentHistory: [],
    });

    logger.info(`Project created: ${project._id || project.id} by ${userId}`);
    return res.status(201).json(project);
  } catch (err: any) {
    logger.error('createProject error:', err.message);
    return res.status(500).json({ error: 'Failed to create project' });
  }
};

export const getProjects = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const projects = await findProjects({ userId });
    return res.json({ projects, total: projects.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getPublicProjects = async (_req: Request, res: Response) => {
  try {
    const projects = await findProjects({ isPublic: true });
    return res.json({ projects, total: projects.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getProject = async (req: Request, res: Response) => {
  try {
    const project = await findProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const userId = req.user?.userId;
    if (!project.isPublic && project.userId !== userId)
      return res.status(403).json({ error: 'Access denied' });
    return res.json(project);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const updates = req.body;
    delete updates.userId; // prevent ownership change

    if (updates.code) {
      try {
        updates.code = 'gzipped:' + zlib.gzipSync(updates.code).toString('base64');
      } catch (e: any) {
        logger.error('failed to compress code in update:', e.message);
      }
    }

    let updated: any;
    try {
      updated = await Project.findOneAndUpdate(
        { _id: req.params.id, userId },
        { ...updates, updatedAt: new Date() },
        { new: true }
      ).lean();
    } catch {
      const existing = memStore.get(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Not found' });
      updated = { ...existing, ...updates, updatedAt: new Date() };
      memStore.set(req.params.id, updated);
    }

    if (!updated) return res.status(404).json({ error: 'Project not found or not yours' });
    return res.json(decompressProject(updated));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    try {
      await Project.findOneAndDelete({ _id: req.params.id, userId });
    } catch {
      memStore.delete(req.params.id);
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const cloneProject = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const original = await findProjectById(req.params.id);
    if (!original) return res.status(404).json({ error: 'Project not found' });

    const clone = await saveProject({
      ...original,
      _id: undefined,
      id: undefined,
      userId,
      title: `${original.title} (copy)`,
      clonedFrom: original._id || original.id,
      isPublic: false,
      deploymentHistory: [],
    });
    return res.status(201).json(clone);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const addDeployRecord = async (req: Request, res: Response) => {
  try {
    const { deviceId, method, status, logs } = req.body;
    const record = { deviceId, method, status, logs, timestamp: new Date() };
    try {
      const p = await Project.findByIdAndUpdate(
        req.params.id,
        { $push: { deploymentHistory: record } },
        { new: true }
      );
      return res.json(p);
    } catch {
      const p = memStore.get(req.params.id);
      if (p) {
        p.deploymentHistory = [...(p.deploymentHistory || []), record];
        memStore.set(req.params.id, p);
      }
      return res.json(p || {});
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
