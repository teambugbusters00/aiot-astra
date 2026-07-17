import React, { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { getPart, PartPin } from '../fritzing/PartRegistry';

export const CustomHardwareNode = memo(({ id, data: rawData, selected }: NodeProps) => {
  const data = rawData as any;
  const partId = data.partId as string;
  const part = getPart(partId);
  const [rotation, setRotation] = useState((data.rotation as number) || 0);
  const pinStates = (data.pinStates as Record<string, boolean | number>) || {};

  useEffect(() => {
    if (data.rotation !== undefined) {
      setRotation(data.rotation as number);
    }
  }, [data.rotation]);

  if (!part) {
    return (
      <div className="p-4 bg-red/20 border border-red/40 rounded text-red text-xs">
        Unknown part: {partId}
      </div>
    );
  }

  // Double click rotates by 90 degrees
  const handleDoubleClick = () => {
    const nextRotation = (rotation + 90) % 360;
    setRotation(nextRotation);
    if (data.onRotate) {
      data.onRotate(id, nextRotation);
    }
  };

  // Render SVG visually based on part category & ID
  const renderVisual = () => {
    const activePin = (pin: string) => !!pinStates[pin];
    const pinVal = (pin: string) => Number(pinStates[pin] || 0);

    switch (part.id) {
      case 'uno':
        return (
          <svg width={part.width} height={part.height} viewBox="0 0 250 180" className="select-none">
            {/* PCB Board */}
            <rect width="250" height="180" rx="10" fill="#005A9C" stroke="#003E6B" strokeWidth="3" />
            
            {/* USB Connector */}
            <rect x="-10" y="25" width="45" height="35" rx="3" fill="#C0C0C0" stroke="#808080" />
            {/* Power Jack */}
            <rect x="-5" y="115" width="40" height="30" rx="3" fill="#1A1A1A" />
            
            {/* ATmega328P Chip */}
            <rect x="130" y="105" width="90" height="22" rx="2" fill="#202020" stroke="#333" />
            <line x1="130" y1="116" x2="220" y2="116" stroke="#444" strokeWidth="2" strokeDasharray="3,3" />
            
            {/* Header Pins background (Top & Bottom) */}
            <rect x="10" y="8" width="230" height="15" fill="#1A1A1A" rx="2" />
            <rect x="50" y="157" width="190" height="15" fill="#1A1A1A" rx="2" />

            {/* Labels */}
            <text x="125" y="90" fill="#FFF" fillOpacity="0.8" fontSize="12" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              ARDUINO UNO
            </text>
            <text x="125" y="70" fill="#FFF" fillOpacity="0.4" fontSize="8" fontFamily="monospace" textAnchor="middle">
              AIoT Studio virtual
            </text>

            {/* Headers labeling */}
            <text x="15" y="32" fill="#888" fontSize="6" fontFamily="sans-serif">AREF GND 13 12 11 10 9 8  7 6 5 4 3 2 1 0</text>
            <text x="55" y="150" fill="#888" fontSize="6" fontFamily="sans-serif">RST 3V 5V G G VIN A0 A1 A2 A3 A4 A5</text>
          </svg>
        );

      case 'esp32':
        return (
          <svg width={part.width} height={part.height} viewBox="0 0 140 240" className="select-none">
            {/* Board */}
            <rect width="140" height="240" rx="8" fill="#1A1A1A" stroke="#333" strokeWidth="3" />
            {/* ESP32 WROOM Chip */}
            <rect x="30" y="20" width="80" height="70" rx="3" fill="#D3D3D3" stroke="#A9A9A9" strokeWidth="2" />
            <rect x="40" y="25" width="60" height="50" fill="#E0E0E0" />
            <text x="70" y="55" fill="#333" fontSize="10" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">ESP32</text>
            
            {/* USB interface */}
            <rect x="55" y="230" width="30" height="15" fill="#C0C0C0" />
            
            {/* Pin header strips */}
            <rect x="8" y="30" width="12" height="190" fill="#111" rx="2" />
            <rect x="120" y="30" width="12" height="190" fill="#111" rx="2" />

            <text x="70" y="130" fill="#FFF" fillOpacity="0.7" fontSize="10" fontFamily="monospace" textAnchor="middle">ESP32 NodeMCU</text>
            <text x="70" y="150" fill="#00E5FF" fillOpacity="0.4" fontSize="8" fontFamily="monospace" textAnchor="middle">WiFi + BT</text>
          </svg>
        );

      case 'led':
        const glowing = activePin('anode') && !activePin('cathode');
        const ledColor = part.defaultColor || 'red';
        const colorHex = ledColor === 'green' ? '#00FF88' : ledColor === 'blue' ? '#3B82F6' : ledColor === 'yellow' ? '#FFB800' : '#FF4455';
        
        return (
          <div className="flex flex-col items-center">
            <svg width={part.width} height={part.height} viewBox="0 0 60 70">
              {/* LED Legs */}
              <line x1="24" y1="40" x2="24" y2="60" stroke="#AAA" strokeWidth="3" />
              <line x1="36" y1="40" x2="36" y2="65" stroke="#AAA" strokeWidth="3" />
              
              {/* LED Bulb base */}
              <path d="M 12,40 L 48,40 A 18,18 0 0,0 12,40 Z" 
                fill={glowing ? colorHex : '#444'} 
                stroke={glowing ? colorHex : '#333'} 
                strokeWidth="2"
                style={{
                  filter: glowing ? `drop-shadow(0 0 10px ${colorHex})` : 'none',
                  transition: 'fill 0.2s, stroke 0.2s'
                }}
              />
              {/* Rim */}
              <rect x="10" y="37" width="40" height="4" rx="1" fill={glowing ? colorHex : '#555'} />
            </svg>
            <div className="text-[9px] text-slate-500 font-mono mt-1">{data.label || 'LED'}</div>
          </div>
        );

      case 'resistor':
        return (
          <svg width={part.width} height={part.height} viewBox="0 0 100 30">
            {/* Wire legs */}
            <line x1="0" y1="15" x2="100" y2="15" stroke="#AAA" strokeWidth="3" />
            {/* Body */}
            <rect x="25" y="7" width="50" height="16" rx="4" fill="#E8D8B8" stroke="#D8B888" strokeWidth="2" />
            {/* Stripes (220 ohm: Red, Red, Brown, Gold) */}
            <rect x="35" y="7" width="4" height="16" fill="#FF4455" />
            <rect x="45" y="7" width="4" height="16" fill="#FF4455" />
            <rect x="55" y="7" width="4" height="16" fill="#8B4513" />
            <rect x="65" y="7" width="4" height="16" fill="#FFD700" />
          </svg>
        );

      case 'oled':
        const hasVcc = activePin('VCC');
        const hasGnd = !activePin('GND'); // simple logic for demo
        const isScreenOn = hasVcc;
        
        return (
          <svg width={part.width} height={part.height} viewBox="0 0 120 100">
            {/* Board */}
            <rect width="120" height="100" rx="5" fill="#003E6B" stroke="#002D52" strokeWidth="2" />
            {/* Screen border */}
            <rect x="10" y="25" width="100" height="65" rx="3" fill="#111" stroke="#333" />
            {/* Active Display Panel */}
            {isScreenOn ? (
              <g>
                <rect x="12" y="27" width="96" height="61" fill="#000" />
                <text x="60" y="45" fill="#FFD700" fontSize="8" fontFamily="monospace" textAnchor="middle">ASTRA SIM</text>
                <text x="60" y="60" fill="#00E5FF" fontSize="7" fontFamily="monospace" textAnchor="middle">Temp: 24 C</text>
                <text x="60" y="75" fill="#00E5FF" fontSize="7" fontFamily="monospace" textAnchor="middle">Humidity: 45%</text>
              </g>
            ) : (
              <text x="60" y="60" fill="#222" fontSize="8" fontFamily="monospace" textAnchor="middle">Display Off</text>
            )}
            {/* Interface header pin labels */}
            <text x="30" y="20" fill="#CCC" fontSize="6" textAnchor="middle">GND</text>
            <text x="50" y="20" fill="#CCC" fontSize="6" textAnchor="middle">VCC</text>
            <text x="70" y="20" fill="#CCC" fontSize="6" textAnchor="middle">SCL</text>
            <text x="90" y="20" fill="#CCC" fontSize="6" textAnchor="middle">SDA</text>
          </svg>
        );

      case 'relay':
        const relayActive = activePin('IN');
        return (
          <svg width={part.width} height={part.height} viewBox="0 0 130 90">
            {/* PCB */}
            <rect width="130" height="90" rx="4" fill="#004d40" stroke="#00332c" strokeWidth="2" />
            {/* Relay cube */}
            <rect x="35" y="10" width="60" height="70" rx="3" fill={relayActive ? '#1E88E5' : '#0D47A1'} stroke="#0A2C66" strokeWidth="2" />
            <text x="65" y="45" fill="#FFF" fontSize="10" fontFamily="sans-serif" textAnchor="middle">RELAY</text>
            <text x="65" y="60" fill="#FFF" fontSize="6" fontFamily="sans-serif" textAnchor="middle">5V DC / 10A</text>
            
            {/* Terminals */}
            <rect x="95" y="15" width="25" height="18" fill="#555" />
            <rect x="95" y="36" width="25" height="18" fill="#555" />
            <rect x="95" y="57" width="25" height="18" fill="#555" />
            
            {/* Indicator LED */}
            <circle cx="20" cy="50" r="4" fill={relayActive ? '#00FF00' : '#440000'} />
          </svg>
        );

      case 'potentiometer':
        const potVal = pinVal('OUT');
        return (
          <div className="flex flex-col items-center">
            <svg width={part.width} height={part.height} viewBox="0 0 80 80">
              {/* Dial base */}
              <circle cx="40" cy="35" r="30" fill="#333" stroke="#222" strokeWidth="3" />
              {/* Pointer indicator */}
              <g transform={`rotate(${(potVal / 1023) * 270 - 135} 40 35)`}>
                <line x1="40" y1="35" x2="40" y2="10" stroke="#00E5FF" strokeWidth="4" strokeLinecap="round" />
              </g>
              {/* Terminals */}
              <rect x="15" y="65" width="10" height="12" fill="#C0C0C0" />
              <rect x="35" y="65" width="10" height="12" fill="#C0C0C0" />
              <rect x="55" y="65" width="10" height="12" fill="#C0C0C0" />
            </svg>
            <div className="text-[9px] text-slate-500 font-mono mt-1">{data.label || 'POT'}: {potVal}</div>
          </div>
        );

      case 'dht22':
        return (
          <svg width={part.width} height={part.height} viewBox="0 0 70 100">
            {/* Body Grid */}
            <rect width="70" height="100" rx="3" fill="#E3F2FD" stroke="#90CAF9" strokeWidth="2" />
            {/* Mesh slats */}
            {Array.from({ length: 7 }).map((_, idx) => (
              <rect key={idx} x="10" y={15 + idx * 10} width="50" height="4" fill="#BBDEFB" />
            ))}
            <text x="35" y="90" fill="#1565C0" fontSize="7" fontWeight="bold" textAnchor="middle">DHT22</text>
          </svg>
        );

      case 'servo':
        return (
          <svg width={part.width} height={part.height} viewBox="0 0 100 90">
            {/* Blue body */}
            <rect x="10" y="30" width="80" height="40" rx="3" fill="#1E88E5" stroke="#1565C0" />
            {/* Circular mounting gear */}
            <circle cx="50" cy="30" r="15" fill="#E0E0E0" />
            {/* Servo Horn */}
            <rect x="35" y="10" width="30" height="10" rx="4" fill="#FFF" />
            <circle cx="40" cy="15" r="2" fill="#999" />
            <circle cx="50" cy="15" r="2" fill="#999" />
            <circle cx="60" cy="15" r="2" fill="#999" />
          </svg>
        );

      case 'pir':
        return (
          <svg width={part.width} height={part.height} viewBox="0 0 100 80">
            {/* Board */}
            <rect width="100" height="80" rx="4" fill="#3B7A57" stroke="#2D5C43" />
            {/* Dome Cover */}
            <circle cx="50" cy="35" r="25" fill="#ECEFF1" stroke="#CFD8DC" strokeWidth="2" />
            <path d="M 30,35 C 30,20 70,20 70,35 Z" fill="#FFF" fillOpacity="0.4" />
            <text x="50" y="70" fill="#FFF" fontSize="8" textAnchor="middle">PIR MOTION</text>
          </svg>
        );

      case 'breadboard':
        return (
          <div className="bg-[#E7E2D8] border-2 border-[#D7D2C8] rounded p-2 flex flex-col justify-between font-mono text-[6px] select-none"
            style={{ width: part.width, height: part.height }}>
            {/* Rails indicator */}
            <div className="flex justify-between px-2 text-[#C0392B] font-bold">
              <span>+  +  +  +  +  +  +  +  +  +  +  +  +  +  +  +  +  +  +  +  +</span>
              <span>+</span>
            </div>
            {/* Board grid pattern */}
            <div className="grid grid-cols-30 gap-1 flex-1 py-1">
              {Array.from({ length: 150 }).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#333] border border-[#BBB] mx-auto cursor-pointer hover:bg-cyan/40" />
              ))}
            </div>
            <div className="flex justify-between px-2 text-[#2980B9] font-bold">
              <span>-  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -</span>
              <span>-</span>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-2 bg-slate-800 text-[10px] text-cyan">
            {part.name}
          </div>
        );
    }
  };

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`relative bg-[#0b0f19]/80 border transition-all rounded shadow-lg ${
        selected ? 'border-[#00E5FF] ring-2 ring-[#00E5FF]/20' : 'border-[#00E5FF]/10 hover:border-[#00E5FF]/30'
      }`}
      style={{
        width: part.width,
        height: part.height,
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 0.15s ease-out'
      }}
    >
      {/* Node Content */}
      <div className="w-full h-full flex items-center justify-center">
        {renderVisual()}
      </div>

      {/* Render pin handles */}
      {part.pins.map((pin: PartPin) => {
        // Compute handle positions based on percentage coordinates
        return (
          <Handle
            key={pin.id}
            id={pin.id}
            type="source" // Treat all as bidirectional source/target for simplicity
            position={Position.Top} // React Flow handles connection rendering style
            style={{
              left: `${pin.x}%`,
              top: `${pin.y}%`,
              width: '8px',
              height: '8px',
              backgroundColor: '#00E5FF',
              border: '2px solid #0b0f19',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              cursor: 'crosshair'
            }}
            title={`${pin.name} (${pin.id})`}
          />
        );
      })}
    </div>
  );
});

CustomHardwareNode.displayName = 'CustomHardwareNode';
