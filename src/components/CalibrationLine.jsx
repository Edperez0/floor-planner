import React from 'react';
import { Line, Circle } from 'react-konva';

function CalibrationLine({ line }) {
  if (!line || !line.start || !line.end) return null;

  return (
    <>
      <Line
        points={[line.start.x, line.start.y, line.end.x, line.end.y]}
        stroke="#e74c3c"
        strokeWidth={3}
        lineCap="round"
        dash={[10, 5]}
      />
      <Circle
        x={line.start.x}
        y={line.start.y}
        radius={6}
        fill="#e74c3c"
      />
      <Circle
        x={line.end.x}
        y={line.end.y}
        radius={6}
        fill="#e74c3c"
      />
    </>
  );
}

export default CalibrationLine;
