import React, { useRef, useEffect } from 'react';
import { Group, Rect, Text, Circle, Transformer } from 'react-konva';

const DELETE_BTN_R = 11;

function FurnitureItem({ item, isSelected, onSelect, onDelete, onDragEnd, onTransformEnd }) {
  const groupRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    } else if (!isSelected && trRef.current) {
      trRef.current.nodes([]);
    }
  }, [isSelected, item.width, item.height, item.rotation]);

  const getColor = (type) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('bed')) return '#8B4513';
    if (lowerType.includes('sofa') || lowerType.includes('loveseat')) return '#CD853F';
    if (lowerType.includes('table')) return '#A0522D';
    if (lowerType.includes('rug')) return '#DEB887';
    if (lowerType.includes('desk')) return '#D2691E';
    return '#8B7355';
  };

  const stopPointerBubble = (e) => {
    e.cancelBubble = true;
  };

  const handleDeletePointer = (e) => {
    e.cancelBubble = true;
    onDelete();
  };

  const w = item.width;
  const h = item.height;
  const delCx = w - DELETE_BTN_R - 6;
  const delCy = DELETE_BTN_R + 6;

  return (
    <>
      <Group
        ref={groupRef}
        name="furniture"
        x={item.x}
        y={item.y}
        rotation={item.rotation}
        offsetX={w / 2}
        offsetY={h / 2}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
      >
        <Rect
          x={0}
          y={0}
          width={w}
          height={h}
          fill={getColor(item.type)}
          stroke={isSelected ? '#3498db' : '#000'}
          strokeWidth={isSelected ? 3 : 1}
          shadowColor="black"
          shadowBlur={5}
          shadowOpacity={0.3}
          shadowOffsetX={2}
          shadowOffsetY={2}
        />
        <Text
          x={0}
          y={0}
          text={`${item.type}\n${item.realWidth.feet}'${item.realWidth.inches}" × ${item.realDepth.feet}'${item.realDepth.inches}"`}
          fontSize={12}
          fill="white"
          align="center"
          verticalAlign="middle"
          width={w}
          height={h}
          listening={false}
        />
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={[]}
          borderEnabled
          borderStroke="#3498db"
          borderStrokeWidth={1}
          padding={6}
          boundBoxFunc={(oldBox, newBox) => newBox}
        />
      )}
      {/* Rendered after Transformer so the delete control stays clickable */}
      {isSelected && (
        <Group
          name="furniture-delete"
          x={item.x}
          y={item.y}
          rotation={item.rotation}
          offsetX={w / 2}
          offsetY={h / 2}
          onMouseDown={stopPointerBubble}
          onTouchStart={stopPointerBubble}
          onClick={handleDeletePointer}
          onTap={handleDeletePointer}
        >
          <Group x={delCx} y={delCy}>
            <Circle
              x={0}
              y={0}
              radius={DELETE_BTN_R}
              fill="#e74c3c"
              stroke="#fff"
              strokeWidth={2}
            />
            <Text
              x={-DELETE_BTN_R}
              y={-10}
              width={DELETE_BTN_R * 2}
              height={20}
              text="×"
              fontSize={18}
              fontStyle="bold"
              fill="#fff"
              align="center"
              verticalAlign="middle"
            />
          </Group>
        </Group>
      )}
    </>
  );
}

export default FurnitureItem;
