import mqtt, { MqttClient } from 'mqtt';
import { Server as SocketServer } from 'socket.io';
import { logger } from '../../config/logger';

let client: MqttClient | null = null;
let io: SocketServer | null = null;

// topic → list of socket room IDs subscribed
const topicSubscriptions = new Map<string, Set<string>>();

// last known value per topic
const topicCache = new Map<string, { payload: string; ts: Date }>();

export function initMQTT(socketServer: SocketServer): void {
  io = socketServer;
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';

  const options: mqtt.IClientOptions = {
    clientId: `ai-iot-astra-backend-${Math.random().toString(16).slice(2, 8)}`,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
  };
  if (process.env.MQTT_USERNAME) options.username = process.env.MQTT_USERNAME;
  if (process.env.MQTT_PASSWORD) options.password = process.env.MQTT_PASSWORD;

  client = mqtt.connect(brokerUrl, options);

  client.on('connect', () => {
    logger.info(`✅ MQTT connected: ${brokerUrl}`);
    // Re-subscribe to all tracked topics
    for (const topic of topicSubscriptions.keys()) {
      client!.subscribe(topic, { qos: 1 });
    }
  });

  client.on('error', (err) => {
    logger.warn(`MQTT error: ${err.message} — dashboard will work without real device data`);
  });

  client.on('offline', () => logger.warn('MQTT offline'));

  client.on('message', (topic, payload) => {
    const payloadStr = payload.toString();
    topicCache.set(topic, { payload: payloadStr, ts: new Date() });

    // Parse payload
    let parsed: any = payloadStr;
    try { parsed = JSON.parse(payloadStr); } catch { /* plain string */ }

    const message = {
      topic,
      payload: parsed,
      rawPayload: payloadStr,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all sockets in the topic room
    io?.to(`mqtt:${topic}`).emit('mqtt:message', message);

    // Also broadcast to general mqtt room
    io?.emit('mqtt:any', message);
  });
}

export function subscribeToTopic(topic: string, socketId?: string): boolean {
  if (!client?.connected) return false;

  if (!topicSubscriptions.has(topic)) {
    topicSubscriptions.set(topic, new Set());
    client.subscribe(topic, { qos: 1 }, (err) => {
      if (err) logger.error(`MQTT subscribe error for ${topic}:`, err);
      else logger.debug(`MQTT subscribed: ${topic}`);
    });
  }

  if (socketId) topicSubscriptions.get(topic)!.add(socketId);
  return true;
}

export function unsubscribeFromTopic(topic: string, socketId: string): void {
  const subs = topicSubscriptions.get(topic);
  if (!subs) return;
  subs.delete(socketId);
  if (subs.size === 0) {
    topicSubscriptions.delete(topic);
    client?.unsubscribe(topic);
    logger.debug(`MQTT unsubscribed: ${topic}`);
  }
}

export function publishMessage(topic: string, payload: string | object, qos: 0 | 1 | 2 = 1): boolean {
  if (!client?.connected) return false;
  const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
  client.publish(topic, msg, { qos });
  return true;
}

export function getTopicCache(): Map<string, { payload: string; ts: Date }> {
  return topicCache;
}

export function getMQTTStatus(): object {
  return {
    connected: client?.connected ?? false,
    topics: Array.from(topicSubscriptions.keys()),
    cachedTopics: topicCache.size,
  };
}
