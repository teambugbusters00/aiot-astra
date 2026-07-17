export type Platform = 'uno' | 'mega' | 'esp32' | 'esp8266' | 'stm32' | 'rp2040' | 'nrf52' | 'riscv' | 'micropython' | 'rpi';

export type ComponentType =
  | 'led' | 'button' | 'potentiometer' | 'lcd1602' | 'oled_ssd1306'
  | 'servo' | 'buzzer' | 'dht11' | 'dht22' | 'hcsr04' | 'pir'
  | 'relay' | 'l298n' | 'neopixel' | 'seven_seg' | 'stepper'
  | 'mq2' | 'mq135' | 'soil_moisture' | 'lm35' | 'ds18b20'
  | 'rfid_rc522' | 'bluetooth_hc05' | 'wifi_esp01' | 'lora_sx1278';

export interface IoTComponent {
  type: ComponentType;
  pin?: number | string;
  pins?: Record<string, number | string>;
  color?: string;
  label?: string;
  value?: number;
}

export interface GeneratedProject {
  id: string;
  prompt: string;
  platform: Platform;
  components: IoTComponent[];
  diagram: WokwiDiagram;
  code: string;
  mqttTopics?: MqttTopicConfig[];
  metadata: ProjectMetadata;
}

export interface WokwiDiagram {
  version: 1;
  author: string;
  editor: 'wokwi' | 'aiot-studio' | 'ai-iot-astra';
  parts: WokwiPart[];
  connections: [string, string, string, string[]][];
}

export interface WokwiPart {
  type: string;
  id: string;
  top: number;
  left: number;
  attrs?: Record<string, string>;
}

export interface ProjectMetadata {
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedPower?: string;
  libraries?: string[];
  notes?: string;
}

export interface MqttTopicConfig {
  topic: string;
  direction: 'publish' | 'subscribe';
  dataType: 'float' | 'int' | 'string' | 'json';
  description: string;
}

export interface CompileResult {
  success: boolean;
  hexPath?: string;
  hexBase64?: string;
  elfPath?: string;
  stderr?: string;
  stdout?: string;
  sizeBytes?: number;
  platform: Platform;
}

export interface DeployResult {
  success: boolean;
  method: 'ota' | 'usb' | 'ssh';
  logs: string[];
  error?: string;
}

export interface SimulationSession {
  id: string;
  projectId: string;
  platform: Platform;
  hexBase64?: string;
  components: IoTComponent[];
  status: 'idle' | 'running' | 'paused' | 'stopped';
  startedAt?: Date;
}

export interface MqttMessage {
  deviceId: string;
  topic: string;
  payload: string | number | object;
  timestamp: Date;
  qos: 0 | 1 | 2;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  generationsUsed: number;
  generationsLimit: number;
}

export interface JwtPayload {
  userId: string;
  email: string;
  plan: string;
  iat?: number;
  exp?: number;
}
