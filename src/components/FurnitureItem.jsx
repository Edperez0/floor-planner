import React, { useRef, useEffect } from 'react';
import { Rect, Text, Transformer } from 'react-konva';

function FurnitureItem({ item, isSelected, onSelect, onDragEnd, onTransformEnd }) {
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      // Attach transformer to the selected shape
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  // Color scheme based on furniture type
  const getColor = (type) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('bed')) return '#8B4513';
    if (lowerType.includes('sofa') || lowerType.includes('loveseat')) return '#CD853F';
    if (lowerType.includes('table')) return '#A0522D';
    if (lowerType.includes('rug')) return '#DEB887';
    if (lowerType.includes('desk')) return '#D2691E';
    return '#8B7355';
  };

  return (
    <>
      <Rect
        ref={shapeRef}
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        fill={getColor(item.type)}
        stroke={isSelected ? '#3498db' : '#000'}
        strokeWidth={isSelected ? 3 : 1}
        draggable
        rotation={item.rotation}
        offsetX={item.width / 2}
        offsetY={item.height / 2}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
        shadowColor="black"
        shadowBlur={5}
        shadowOpacity={0.3}
        shadowOffsetX={2}
        shadowOffsetY={2}
      />
      <Text
        x={item.x}
        y={item.y}
        text={`${item.type}\n${item.realWidth.feet}'${item.realWidth.inches}" × ${item.realDepth.feet}'${item.realDepth.inches}"`}
        fontSize={12}
        fill="white"
        align="center"
        verticalAlign="middle"
        width={item.width}
        height={item.height}
        offsetX={item.width / 2}
        offsetY={item.height / 2}
        rotation={item.rotation}
        listening={false}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit resize to prevent negative dimensions
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
          enabledAnchors={[
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
          ]}
          rotateEnabled={true}
        />
      )}
    </>
  );
}

export default FurnitureItem;
