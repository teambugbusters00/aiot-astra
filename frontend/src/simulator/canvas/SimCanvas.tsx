import React, { useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { CustomHardwareNode } from './CustomHardwareNode';
import BezierWireEdge from './BezierWireEdge';
import { AutoRouter } from '../wiring/AutoRouter';

interface SimCanvasProps {
  platform: string;
  components: any[];
  pinStates: Record<string, boolean | number>;
}

export default function SimCanvas({ platform, components, pinStates }: SimCanvasProps) {
  // Define custom React Flow Node types
  const nodeTypes = useMemo(() => ({
    hardware: CustomHardwareNode
  }), []);

  // Define custom React Flow Edge types
  const edgeTypes = useMemo(() => ({
    bezier: BezierWireEdge
  }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Generate layout when components or platform changes
  useEffect(() => {
    const layout = AutoRouter.generateLayout(platform, components);
    setNodes(layout.nodes as any);
    setEdges(layout.edges as any);
  }, [platform, components, setNodes, setEdges]);

  // Sync live pinStates into custom nodes
  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id === 'controller') {
          return {
            ...node,
            data: {
              ...node.data,
              pinStates
            }
          };
        } else {
          // Find if this peripheral is connected to a pin that changed state
          const incomingEdges = edges.filter((e) => e.source === node.id);
          const activeStates: Record<string, boolean | number> = {};
          
          for (const edge of incomingEdges) {
            const controllerPin = edge.targetHandle;
            if (controllerPin && pinStates[controllerPin] !== undefined) {
              const val = pinStates[controllerPin];
              const sourcePin = edge.sourceHandle;
              if (sourcePin) activeStates[sourcePin] = val;
            }
          }

          return {
            ...node,
            data: {
              ...node.data,
              pinStates: activeStates
            }
          };
        }
      })
    );

    // Glow edges/wires that carry electrical current (high state)
    setEdges((currentEdges) =>
      currentEdges.map((edge) => {
        const pin = edge.targetHandle;
        const active = pin ? !!pinStates[pin] : false;
        return {
          ...edge,
          data: {
            ...edge.data,
            glowing: active
          }
        };
      })
    );
  }, [pinStates, edges, setNodes, setEdges]);

  const onConnect = (params: Connection) => {
    const newEdge: Edge = {
      ...params,
      id: `wire_manual_${Date.now()}`,
      type: 'bezier',
      data: {
        color: '#00E5FF',
        glowing: false
      }
    } as Edge;
    setEdges((eds) => addEdge(newEdge, eds));
  };

  const handleRotate = (nodeId: string, rotation: number) => {
    setNodes((currentNodes) =>
      currentNodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, rotation } } : n))
    );
  };

  // Inject rotation callback into node data
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        onRotate: handleRotate
      }
    }));
  }, [nodes]);

  return (
    <div className="w-full h-[500px] border border-cyan/15 rounded-md bg-[#070b13] relative overflow-hidden">
      {/* Grid Canvas */}
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        snapToGrid={true}
        snapGrid={[10, 10]}
        minZoom={0.5}
        maxZoom={2}
      >
        <Background color="#00e5ff" style={{ opacity: 0.05 }} gap={10} size={1} />
        <Controls className="bg-slate-900 border border-cyan/20 text-cyan rounded-md" />
      </ReactFlow>

      {/* Floating Instructions */}
      <div className="absolute bottom-4 right-4 z-10 p-2 bg-black/60 backdrop-blur border border-cyan/15 rounded text-[10px] text-slate-400 select-none pointer-events-none">
        💡 Double-click component to **Rotate** (90°)<br />
        🖱️ Drag handles to connect wires manually
      </div>
    </div>
  );
}
