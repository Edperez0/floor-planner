import React, { useRef, useEffect, useCallback, useState, memo } from 'react';
import { Group, Rect, Text, Transformer, Line } from 'react-konva';
import { defaultFillColorForType } from '../utils/furnitureColors';

const TOOL_BTN = 26;
const TOOL_GAP = 8;
const TOOLBAR_Y = 38;
const CORNER = 9;
const CORNER_STROKE = 1.5;

/**
 * While dragging, we omit x/y props so parent re-renders (pan/zoom) cannot reset the Konva node
 * to stale React state — that was causing visible lag / cursor trailing.
 */
function FurnitureItemInner({
  item,
  isSelected,
  panMode = false,
  onSelect,
  onDeselect,
  onColorChange,
  onDragEnd,
  onTransformEnd,
}) {
  const groupRef = useRef();
  const trRef = useRef();
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    } else if (!isSelected && trRef.current) {
      trRef.current.nodes([]);
    }
  }, [isSelected, item.width, item.height, item.rotation, item.fillColor]);

  const fill = item.fillColor ?? defaultFillColorForType(item.type);

  const stopPointerBubble = (e) => {
    e.cancelBubble = true;
  };

  const openSystemColorPicker = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'color';
    const normalized = /^#[0-9A-Fa-f]{6}$/.test(fill) ? fill : '#888888';
    input.value = normalized;
    input.setAttribute('aria-label', 'Choose furniture color');
    input.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
    const cleanup = () => {
      input.remove();
    };
    input.addEventListener(
      'change',
      () => {
        onColorChange(input.value);
        cleanup();
      },
      { once: true }
    );
    input.addEventListener('blur', () => setTimeout(cleanup, 0), { once: true });
    document.body.appendChild(input);
    input.focus();
    input.click();
  }, [fill, onColorChange]);

  const handleToolbarColor = (e) => {
    e.cancelBubble = true;
    openSystemColorPicker();
  };

  const handleToolbarDeselect = (e) => {
    e.cancelBubble = true;
    onDeselect();
  };

  const w = item.width;
  const h = item.height;

  const toolbarTotalW = TOOL_BTN * 2 + TOOL_GAP;
  const toolbarX = w / 2 - toolbarTotalW / 2;
  const toolbarY = -TOOLBAR_Y;

  const interactive = !panMode;

  const handleDragStart = useCallback(() => {
    setDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    (e) => {
      onDragEnd(e);
      setDragging(false);
    },
    [onDragEnd]
  );

  const positionProps = dragging ? {} : { x: item.x, y: item.y };

  return (
    <>
      <Group
        ref={groupRef}
        id={String(item.id)}
        name="furniture"
        {...positionProps}
        rotation={item.rotation}
        offsetX={w / 2}
        offsetY={h / 2}
        listening={interactive}
        draggable={interactive}
        onClick={onSelect}
        onTap={onSelect}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onTransformEnd={onTransformEnd}
      >
        <Rect
          x={0}
          y={0}
          width={w}
          height={h}
          fill={fill}
          stroke={isSelected ? 'rgba(30, 41, 59, 0.2)' : '#000'}
          strokeWidth={1}
          hitStrokeWidth={14}
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

        {isSelected && (
          <Group listening={false}>
            <Line
              points={[-CORNER, 0, 0, 0, 0, -CORNER]}
              stroke="#64748b"
              strokeWidth={CORNER_STROKE}
              lineCap="round"
              lineJoin="round"
            />
            <Line
              points={[w + CORNER, 0, w, 0, w, -CORNER]}
              stroke="#64748b"
              strokeWidth={CORNER_STROKE}
              lineCap="round"
              lineJoin="round"
            />
            <Line
              points={[w + CORNER, h, w, h, w, h + CORNER]}
              stroke="#64748b"
              strokeWidth={CORNER_STROKE}
              lineCap="round"
              lineJoin="round"
            />
            <Line
              points={[-CORNER, h, 0, h, 0, h + CORNER]}
              stroke="#64748b"
              strokeWidth={CORNER_STROKE}
              lineCap="round"
              lineJoin="round"
            />
          </Group>
        )}

        {isSelected && (
          <Group
            name="furniture-selection-toolbar"
            x={toolbarX}
            y={toolbarY}
            listening={interactive}
            onPointerDown={stopPointerBubble}
            onMouseDown={stopPointerBubble}
            onTouchStart={stopPointerBubble}
          >
            <Group onClick={handleToolbarColor} onTap={handleToolbarColor}>
              <Rect
                x={0}
                y={0}
                width={TOOL_BTN}
                height={TOOL_BTN}
                fill={fill}
                cornerRadius={4}
                stroke="rgba(255,255,255,0.65)"
                strokeWidth={1}
                shadowColor="rgba(0,0,0,0.15)"
                shadowBlur={4}
                shadowOffsetY={1}
              />
              <Rect
                x={4}
                y={4}
                width={TOOL_BTN - 8}
                height={TOOL_BTN - 8}
                fill="rgba(0,0,0,0)"
                stroke="rgba(0,0,0,0.25)"
                strokeWidth={1}
                cornerRadius={2}
                listening={false}
              />
            </Group>
            <Group
              x={TOOL_BTN + TOOL_GAP}
              onClick={handleToolbarDeselect}
              onTap={handleToolbarDeselect}
            >
              <Rect
                x={0}
                y={0}
                width={TOOL_BTN}
                height={TOOL_BTN}
                fill="#ffffff"
                cornerRadius={4}
                stroke="#cbd5e1"
                strokeWidth={1}
                shadowColor="rgba(0,0,0,0.12)"
                shadowBlur={4}
                shadowOffsetY={1}
              />
              <Text
                x={0}
                y={0}
                width={TOOL_BTN}
                height={TOOL_BTN}
                text="×"
                fontSize={20}
                fontStyle="bold"
                fill="#475569"
                align="center"
                verticalAlign="middle"
              />
            </Group>
          </Group>
        )}
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          listening={interactive}
          rotateEnabled
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          enabledAnchors={[]}
          borderEnabled
          borderStroke="#64748b"
          borderStrokeWidth={1}
          borderDash={[5, 5]}
          padding={8}
          boundBoxFunc={(oldBox, newBox) => newBox}
        />
      )}
    </>
  );
}

/** Skip re-renders from parent pan/zoom when this item's data and selection did not change. */
const FurnitureItem = memo(FurnitureItemInner, (prev, next) => {
  return (
    prev.item === next.item &&
    prev.isSelected === next.isSelected &&
    prev.panMode === next.panMode
  );
});

export default FurnitureItem;
