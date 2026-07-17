import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore } from '../lib/store';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL || '', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

export function useSocket() {
  const { addMqttMessage, addSerialLine } = useStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const s = getSocket();

    s.on('mqtt:message', (msg: any) => {
      addMqttMessage({ topic: msg.topic, payload: msg.payload, ts: msg.timestamp });
    });

    s.on('mqtt:any', (msg: any) => {
      addMqttMessage({ topic: msg.topic, payload: msg.payload, ts: msg.timestamp });
    });

    s.on('serial:line', ({ line }: { line: string }) => {
      addSerialLine(line);
    });

    s.on('connect', () => console.log('Socket connected:', s.id));
    s.on('disconnect', () => console.log('Socket disconnected'));

    return () => {
      s.off('mqtt:message');
      s.off('mqtt:any');
      s.off('serial:line');
    };
  }, []);

  return socket;
}

export function subscribeMQTT(topic: string) {
  getSocket().emit('mqtt:subscribe', topic);
}

export function publishMQTT(topic: string, payload: any) {
  getSocket().emit('mqtt:publish', { topic, payload });
}

export function joinSimulation(sessionId: string) {
  getSocket().emit('simulation:join', sessionId);
}
