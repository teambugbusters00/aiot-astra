import React from 'react';
import { EdgeProps, getBezierPath, useStore } from '@xyflow/react';

export default function BezierWireEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data
}: EdgeProps) {
  // Use React Flow's getBezierPath helper to compute the control points
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
    curvature: 0.6 // increase curvature for nice hanging wire look
  });

  const wireColor = (data?.color as string) || '#00E5FF';
  const isGlowing = data?.glowing as boolean;

  return (
    <>
      {/* Background thicker shadow path for glow effect */}
      {isGlowing && (
        <path
          id={`${id}-glow`}
          className="react-flow__edge-path"
          d={edgePath}
          fill="none"
          stroke={wireColor}
          strokeWidth={6}
          strokeOpacity={0.25}
          style={{ filter: `blur(4px)` }}
        />
      )}

      {/* Main wire path */}
      <path
        id={id}
        className="react-flow__edge-path transition-all duration-300"
        d={edgePath}
        fill="none"
        stroke={wireColor}
        strokeWidth={3}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: wireColor,
          filter: isGlowing ? `drop-shadow(0 0 2px ${wireColor})` : 'none'
        }}
      />
      
      {/* Interactive hover target */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={15}
        className="cursor-pointer"
      />
    </>
  );
}
