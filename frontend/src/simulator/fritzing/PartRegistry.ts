export interface PartPin {
  id: string;
  name: string;
  x: number; // percentage from left (0 to 100)
  y: number; // percentage from top (0 to 100)
  type?: 'input' | 'output' | 'power' | 'ground' | 'analog' | 'digital' | 'i2c' | 'spi' | 'utility';
}

export interface FritzingPart {
  id: string;
  name: string;
  category: 'controller' | 'sensor' | 'actuator' | 'display' | 'discrete' | 'utility';
  width: number; // visual canvas width in pixels
  height: number; // visual canvas height in pixels
  pins: PartPin[];
  description: string;
  defaultColor?: string;
}

export const FRITZING_PARTS: Record<string, FritzingPart> = {
  uno: {
    id: 'uno',
    name: 'Arduino Uno R3',
    category: 'controller',
    width: 250,
    height: 180,
    description: 'AVR ATmega328P microcontroller board',
    pins: [
      // Power & Analog Header (Bottom)
      { id: 'RESET', name: 'RESET', x: 25, y: 92, type: 'utility' },
      { id: '3V3', name: '3.3V', x: 32, y: 92, type: 'power' },
      { id: '5V', name: '5V', x: 39, y: 92, type: 'power' },
      { id: 'GND1', name: 'GND', x: 46, y: 92, type: 'ground' },
      { id: 'GND2', name: 'GND', x: 53, y: 92, type: 'ground' },
      { id: 'VIN', name: 'VIN', x: 60, y: 92, type: 'power' },
      { id: 'A0', name: 'A0', x: 70, y: 92, type: 'analog' },
      { id: 'A1', name: 'A1', x: 77, y: 92, type: 'analog' },
      { id: 'A2', name: 'A2', x: 84, y: 92, type: 'analog' },
      { id: 'A3', name: 'A3', x: 91, y: 92, type: 'analog' },
      { id: 'A4', name: 'A4', x: 98, y: 92, type: 'analog' },
      { id: 'A5', name: 'A5', x: 105, y: 92, type: 'analog' }, // Offset to match design

      // Digital Header (Top)
      { id: 'D0', name: 'D0/RX', x: 98, y: 8, type: 'digital' },
      { id: 'D1', name: 'D1/TX', x: 91, y: 8, type: 'digital' },
      { id: 'D2', name: 'D2', x: 84, y: 8, type: 'digital' },
      { id: 'D3', name: 'D3~', x: 77, y: 8, type: 'digital' },
      { id: 'D4', name: 'D4', x: 70, y: 8, type: 'digital' },
      { id: 'D5', name: 'D5~', x: 63, y: 8, type: 'digital' },
      { id: 'D6', name: 'D6~', x: 56, y: 8, type: 'digital' },
      { id: 'D7', name: 'D7', x: 49, y: 8, type: 'digital' },
      { id: 'D8', name: 'D8', x: 39, y: 8, type: 'digital' },
      { id: 'D9', name: 'D9~', x: 32, y: 8, type: 'digital' },
      { id: 'D10', name: 'D10~', x: 25, y: 8, type: 'digital' },
      { id: 'D11', name: 'D11~', x: 18, y: 8, type: 'digital' },
      { id: 'D12', name: 'D12', x: 11, y: 8, type: 'digital' },
      { id: 'D13', name: 'D13', x: 4, y: 8, type: 'digital' },
      { id: 'GND3', name: 'GND', x: -3, y: 8, type: 'ground' },
      { id: 'AREF', name: 'AREF', x: -10, y: 8, type: 'utility' }
    ]
  },
  esp32: {
    id: 'esp32',
    name: 'ESP32 NodeMCU',
    category: 'controller',
    width: 140,
    height: 240,
    description: 'Wi-Fi & Bluetooth microcontroller module',
    pins: [
      // Left side pins (Top to Bottom)
      { id: 'EN', name: 'EN', x: 10, y: 15, type: 'utility' },
      { id: 'VP', name: 'GPIO36', x: 10, y: 23, type: 'analog' },
      { id: 'VN', name: 'GPIO39', x: 10, y: 31, type: 'analog' },
      { id: 'D34', name: 'GPIO34', x: 10, y: 39, type: 'analog' },
      { id: 'D35', name: 'GPIO35', x: 10, y: 47, type: 'analog' },
      { id: 'D32', name: 'GPIO32', x: 10, y: 55, type: 'digital' },
      { id: 'D33', name: 'GPIO33', x: 10, y: 63, type: 'digital' },
      { id: 'D25', name: 'GPIO25', x: 10, y: 71, type: 'digital' },
      { id: 'D26', name: 'GPIO26', x: 10, y: 79, type: 'digital' },
      { id: 'D27', name: 'GPIO27', x: 10, y: 87, type: 'digital' },
      { id: 'D14', name: 'GPIO14', x: 10, y: 95, type: 'digital' },
      { id: 'D12', name: 'GPIO12', x: 10, y: 103, type: 'digital' },
      { id: 'D13', name: 'GPIO13', x: 10, y: 111, type: 'digital' },
      { id: 'GND1', name: 'GND', x: 10, y: 119, type: 'ground' },
      { id: '5V', name: 'VIN', x: 10, y: 127, type: 'power' },

      // Right side pins (Bottom to Top)
      { id: '3V3', name: '3.3V', x: 90, y: 15, type: 'power' },
      { id: 'GND2', name: 'GND', x: 90, y: 23, type: 'ground' },
      { id: 'D15', name: 'GPIO15', x: 90, y: 31, type: 'digital' },
      { id: 'D2', name: 'GPIO2', x: 90, y: 39, type: 'digital' },
      { id: 'D4', name: 'GPIO4', x: 90, y: 47, type: 'digital' },
      { id: 'RX2', name: 'GPIO16', x: 90, y: 55, type: 'digital' },
      { id: 'TX2', name: 'GPIO17', x: 90, y: 63, type: 'digital' },
      { id: 'D5', name: 'GPIO5', x: 90, y: 71, type: 'digital' },
      { id: 'D18', name: 'GPIO18', x: 90, y: 79, type: 'digital' },
      { id: 'D19', name: 'GPIO19', x: 90, y: 87, type: 'digital' },
      { id: 'D21', name: 'GPIO21', x: 90, y: 95, type: 'i2c' },
      { id: 'RXD', name: 'GPIO3', x: 90, y: 103, type: 'digital' },
      { id: 'TXD', name: 'GPIO1', x: 90, y: 111, type: 'digital' },
      { id: 'D22', name: 'GPIO22', x: 90, y: 119, type: 'i2c' },
      { id: 'D23', name: 'GPIO23', x: 90, y: 127, type: 'digital' }
    ]
  },
  led: {
    id: 'led',
    name: 'Red LED',
    category: 'actuator',
    width: 60,
    height: 70,
    description: 'Light Emitting Diode (LED)',
    defaultColor: 'red',
    pins: [
      { id: 'anode', name: 'Anode (+)', x: 40, y: 85, type: 'input' },
      { id: 'cathode', name: 'Cathode (-)', x: 60, y: 85, type: 'ground' }
    ]
  },
  resistor: {
    id: 'resistor',
    name: 'Resistor 220Ω',
    category: 'discrete',
    width: 100,
    height: 30,
    description: 'Current limiting resistor',
    pins: [
      { id: 'pin1', name: 'Pin 1', x: 5, y: 50 },
      { id: 'pin2', name: 'Pin 2', x: 95, y: 50 }
    ]
  },
  oled: {
    id: 'oled',
    name: 'OLED SSD1306',
    category: 'display',
    width: 120,
    height: 100,
    description: '128x64 I2C OLED screen',
    pins: [
      { id: 'GND', name: 'GND', x: 25, y: 10, type: 'ground' },
      { id: 'VCC', name: 'VCC', x: 42, y: 10, type: 'power' },
      { id: 'SCL', name: 'SCL', x: 58, y: 10, type: 'i2c' },
      { id: 'SDA', name: 'SDA', x: 75, y: 10, type: 'i2c' }
    ]
  },
  relay: {
    id: 'relay',
    name: 'Relay Module',
    category: 'actuator',
    width: 130,
    height: 90,
    description: '1-Channel 5V Relay module',
    pins: [
      // Input side
      { id: 'GND', name: 'GND', x: 10, y: 75, type: 'ground' },
      { id: 'IN', name: 'IN', x: 10, y: 50, type: 'input' },
      { id: 'VCC', name: 'VCC', x: 10, y: 25, type: 'power' },

      // Output switch terminals
      { id: 'NO', name: 'NO (Normally Open)', x: 90, y: 25, type: 'utility' },
      { id: 'COM', name: 'COM (Common)', x: 90, y: 50, type: 'utility' },
      { id: 'NC', name: 'NC (Normally Closed)', x: 90, y: 75, type: 'utility' }
    ]
  },
  potentiometer: {
    id: 'potentiometer',
    name: 'Potentiometer',
    category: 'sensor',
    width: 80,
    height: 80,
    description: 'Rotary variable resistor (10k)',
    pins: [
      { id: 'GND', name: 'GND', x: 20, y: 85, type: 'ground' },
      { id: 'OUT', name: 'OUT', x: 50, y: 85, type: 'analog' },
      { id: 'VCC', name: 'VCC', x: 80, y: 85, type: 'power' }
    ]
  },
  dht22: {
    id: 'dht22',
    name: 'DHT22 Sensor',
    category: 'sensor',
    width: 70,
    height: 100,
    description: 'Temperature and humidity sensor',
    pins: [
      { id: 'VCC', name: 'VCC', x: 20, y: 90, type: 'power' },
      { id: 'SDA', name: 'DATA', x: 40, y: 90, type: 'digital' },
      { id: 'NC', name: 'NC', x: 60, y: 90, type: 'utility' },
      { id: 'GND', name: 'GND', x: 80, y: 90, type: 'ground' }
    ]
  },
  servo: {
    id: 'servo',
    name: 'Servo SG90',
    category: 'actuator',
    width: 100,
    height: 90,
    description: '9g Micro Servo Motor',
    pins: [
      { id: 'PWM', name: 'PWM (Orange)', x: 30, y: 90, type: 'input' },
      { id: 'VCC', name: 'VCC (Red)', x: 50, y: 90, type: 'power' },
      { id: 'GND', name: 'GND (Brown)', x: 70, y: 90, type: 'ground' }
    ]
  },
  pir: {
    id: 'pir',
    name: 'PIR Motion Sensor',
    category: 'sensor',
    width: 100,
    height: 80,
    description: 'HC-SR501 Pyroelectric Infrared Sensor',
    pins: [
      { id: 'GND', name: 'GND', x: 30, y: 90, type: 'ground' },
      { id: 'OUT', name: 'OUT', x: 50, y: 90, type: 'output' },
      { id: 'VCC', name: 'VCC', x: 70, y: 90, type: 'power' }
    ]
  },
  breadboard: {
    id: 'breadboard',
    name: 'Half Breadboard',
    category: 'utility',
    width: 450,
    height: 140,
    description: 'Prototyping breadboard (400 holes)',
    pins: [] // Special component rendered using grid layout snapping
  }
};

export function getPart(id: string): FritzingPart | undefined {
  return FRITZING_PARTS[id];
}
