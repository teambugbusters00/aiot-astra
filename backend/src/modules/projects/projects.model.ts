import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  userId?: string;
  title: string;
  description: string;
  prompt: string;
  platform: string;
  components: object[];
  diagram: object;
  code: string;
  mqttTopics?: object[];
  simulationId?: string;
  deploymentHistory: DeployRecord[];
  tags: string[];
  isPublic: boolean;
  clonedFrom?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DeployRecord {
  deviceId: string;
  method: string;
  status: 'success' | 'failed';
  timestamp: Date;
  logs?: string;
}

const DeployRecordSchema = new Schema<DeployRecord>({
  deviceId: String,
  method: String,
  status: { type: String, enum: ['success', 'failed'] },
  timestamp: { type: Date, default: Date.now },
  logs: String,
}, { _id: false });

const ProjectSchema = new Schema<IProject>(
  {
    userId: { type: String, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    prompt: { type: String, required: true },
    platform: { type: String, required: true },
    components: [{ type: Schema.Types.Mixed }],
    diagram: { type: Schema.Types.Mixed },
    code: { type: String, default: '' },
    mqttTopics: [{ type: Schema.Types.Mixed }],
    simulationId: { type: String },
    deploymentHistory: [DeployRecordSchema],
    tags: [{ type: String }],
    isPublic: { type: Boolean, default: false },
    clonedFrom: { type: String },
  },
  { timestamps: true }
);

ProjectSchema.index({ userId: 1, createdAt: -1 });
ProjectSchema.index({ isPublic: 1, createdAt: -1 });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
