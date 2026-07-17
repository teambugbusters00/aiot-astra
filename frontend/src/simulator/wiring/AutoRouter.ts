import { FritzingPart, getPart } from '../fritzing/PartRegistry';

export interface GeneratedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    partId: string;
    label: string;
    rotation: number;
    pinStates: Record<string, boolean | number>;
  };
}

export interface GeneratedEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  type: string; // custom edge type 'bezier'
  data: {
    color: string;
    glowing: boolean;
  };
}

export class AutoRouter {
  /**
   * Generates nodes and edges layout based on project components list and controller platform
   */
  static generateLayout(
    platform: string,
    components: any[]
  ): { nodes: GeneratedNode[]; edges: GeneratedEdge[] } {
    const nodes: GeneratedNode[] = [];
    const edges: GeneratedEdge[] = [];

    // 1. Add Controller Node (Uno or ESP32)
    const controllerId = platform === 'esp32' ? 'esp32' : 'uno';
    const controllerX = 250;
    const controllerY = 200;

    nodes.push({
      id: 'controller',
      type: 'hardware',
      position: { x: controllerX, y: controllerY },
      data: {
        partId: controllerId,
        label: platform === 'esp32' ? 'ESP32 NodeMCU' : 'Arduino Uno',
        rotation: 0,
        pinStates: {}
      }
    });

    // 2. Add Breadboard Node (centered at bottom)
    nodes.push({
      id: 'breadboard_1',
      type: 'hardware',
      position: { x: 150, y: 450 },
      data: {
        partId: 'breadboard',
        label: 'Half Breadboard',
        rotation: 0,
        pinStates: {}
      }
    });

    // 3. Process peripheral components
    // Place them in a grid layout above/around the controller
    let peripheralIndex = 0;
    const itemsPerRow = 4;
    const startX = 50;
    const startY = 20;
    const gapX = 160;
    const gapY = 130;

    for (const comp of components) {
      const part = getPart(comp.type);
      if (!part || part.id === 'uno' || part.id === 'esp32') continue;

      const nodeId = `comp_${comp.type}_${peripheralIndex}`;
      
      // Calculate coordinates around controller
      const row = Math.floor(peripheralIndex / itemsPerRow);
      const col = peripheralIndex % itemsPerRow;
      const posX = startX + col * gapX;
      const posY = startY + row * gapY;

      nodes.push({
        id: nodeId,
        type: 'hardware',
        position: { x: posX, y: posY },
        data: {
          partId: part.id,
          label: comp.label || `${part.name} ${peripheralIndex + 1}`,
          rotation: 0,
          pinStates: {}
        }
      });

      // 4. Auto-route pins to the controller
      const mappedPin = comp.pin !== undefined ? String(comp.pin) : null;
      
      // Select appropriate prefix for pins based on controller board
      const pinPrefix = platform === 'esp32' ? 'D' : '';
      const controllerPinId = mappedPin 
        ? (mappedPin.startsWith('A') || mappedPin.startsWith('D') ? mappedPin : `${pinPrefix}${mappedPin}`)
        : null;

      // Draw wires based on component type
      if (part.id === 'led') {
        // LED Anode to controller pin
        if (controllerPinId) {
          edges.push(this.createWire(nodeId, 'anode', 'controller', controllerPinId, '#E91E63'));
        }
        // LED Cathode to GND
        const gndPin = platform === 'esp32' ? 'GND1' : 'GND1';
        edges.push(this.createWire(nodeId, 'cathode', 'controller', gndPin, '#000000')); // Black GND
      } 
      else if (part.id === 'oled') {
        // OLED SDA -> A4/D21, SCL -> A5/D22
        const sdaTarget = platform === 'esp32' ? 'D21' : 'A4';
        const sclTarget = platform === 'esp32' ? 'D22' : 'A5';
        const vccTarget = platform === 'esp32' ? '3V3' : '5V';
        const gndTarget = platform === 'esp32' ? 'GND1' : 'GND2';

        edges.push(this.createWire(nodeId, 'SDA', 'controller', sdaTarget, '#4CAF50')); // Green SDA
        edges.push(this.createWire(nodeId, 'SCL', 'controller', sclTarget, '#FFEB3B')); // Yellow SCL
        edges.push(this.createWire(nodeId, 'VCC', 'controller', vccTarget, '#FF5722')); // Red VCC
        edges.push(this.createWire(nodeId, 'GND', 'controller', gndTarget, '#000000')); // Black GND
      }
      else if (part.id === 'potentiometer') {
        // Potentiometer Signal -> A0/A1
        const sigPin = controllerPinId || (platform === 'esp32' ? 'VP' : 'A0');
        const vccTarget = platform === 'esp32' ? '3V3' : '5V';
        const gndTarget = platform === 'esp32' ? 'GND2' : 'GND1';

        edges.push(this.createWire(nodeId, 'OUT', 'controller', sigPin, '#3F51B5')); // Blue signal
        edges.push(this.createWire(nodeId, 'VCC', 'controller', vccTarget, '#FF5722'));
        edges.push(this.createWire(nodeId, 'GND', 'controller', gndTarget, '#000000'));
      }
      else if (part.id === 'relay') {
        const sigPin = controllerPinId || (platform === 'esp32' ? 'D32' : 'D8');
        const vccTarget = platform === 'esp32' ? '5V' : '5V';
        const gndTarget = platform === 'esp32' ? 'GND1' : 'GND1';

        edges.push(this.createWire(nodeId, 'IN', 'controller', sigPin, '#FF9800')); // Orange signal
        edges.push(this.createWire(nodeId, 'VCC', 'controller', vccTarget, '#FF5722'));
        edges.push(this.createWire(nodeId, 'GND', 'controller', gndTarget, '#000000'));
      }
      else if (part.id === 'servo') {
        const pwmPin = controllerPinId || (platform === 'esp32' ? 'D18' : 'D9');
        const vccTarget = platform === 'esp32' ? '5V' : '5V';
        const gndTarget = platform === 'esp32' ? 'GND1' : 'GND1';

        edges.push(this.createWire(nodeId, 'PWM', 'controller', pwmPin, '#FFEB3B'));
        edges.push(this.createWire(nodeId, 'VCC', 'controller', vccTarget, '#FF5722'));
        edges.push(this.createWire(nodeId, 'GND', 'controller', gndTarget, '#000000'));
      }
      else if (part.id === 'pir' || part.id === 'dht22') {
        const outPin = controllerPinId || (platform === 'esp32' ? 'D4' : 'D2');
        const signalColor = part.id === 'pir' ? '#9C27B0' : '#E91E63';
        const vccTarget = platform === 'esp32' ? '3V3' : '5V';
        const gndTarget = platform === 'esp32' ? 'GND1' : 'GND2';

        edges.push(this.createWire(nodeId, part.id === 'pir' ? 'OUT' : 'SDA', 'controller', outPin, signalColor));
        edges.push(this.createWire(nodeId, 'VCC', 'controller', vccTarget, '#FF5722'));
        edges.push(this.createWire(nodeId, 'GND', 'controller', gndTarget, '#000000'));
      }

      peripheralIndex++;
    }

    return { nodes, edges };
  }

  private static createWire(
    sourceNode: string,
    sourcePin: string,
    targetNode: string,
    targetPin: string,
    color: string
  ): GeneratedEdge {
    return {
      id: `wire_${sourceNode}_${sourcePin}_to_${targetPin}`,
      source: sourceNode,
      sourceHandle: sourcePin,
      target: targetNode,
      targetHandle: targetPin,
      type: 'bezier',
      data: {
        color,
        glowing: false
      }
    };
  }
}
