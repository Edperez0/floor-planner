import React, { useRef, useEffect, useCallback, useState, memo } from 'react';
import { Group, Rect, Text, Transformer, Line } from 'react-konva';
import { defaultFillColorForType } from '../utils/furnitureColors';

const CORNER = 9;
const CORNER_STROKE = 1.5;
/** In-rect top-right deselect control (local coords; mimics CSS top/right ~2px). */
const INSET = 2;
const CLOSE_HIT = 20;

/** Stable refs — new function/array instances each render force react-konva to refresh the Transformer (major drag jank). */
const BOUND_BOX_PASSTHROUGH = (oldBox, newBox) => newBox;
const ROTATION_SNAPS = [0, 45, 90, 135, 180, 225, 270, 315];
const BORDER_DASH = [5, 5];

/**
 * While dragging, omit x/y props so any stray React reconciliation cannot snap the node back to stale state.
 * Transformer + layer batchDraw on dragMove keeps selection chrome in sync with the node (Konva otherwise can lag a frame).
 */
function FurnitureItemInner({
  item,
  isSelected,
  panMode = false,
  onSelect,
  onDeselect,
  onDragEnd,
  onTransformEnd,
}) {
  const groupRef = useRef(null);
  const trRef = useRef(null);
  const dragMoveRafRef = useRef(null);
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

  const handleInsetDeselect = useCallback(
    (e) => {
      e.cancelBubble = true;
      onDeselect();
    },
    [onDeselect]
  );

  const w = item.width;
  const h = item.height;

  const closeX = w - CLOSE_HIT - INSET;
  const closeY = INSET;

  const interactive = !panMode;

  /** Konva skips Transformer.update() while the target node is dragging — force refresh so the box/handles track the move. */
  const flushTransformerWithLayer = useCallback(() => {
    trRef.current?.forceUpdate();
  }, []);

  const handleDragMove = useCallback(() => {
    if (dragMoveRafRef.current != null) return;
    dragMoveRafRef.current = requestAnimationFrame(() => {
      dragMoveRafRef.current = null;
      flushTransformerWithLayer();
    });
  }, [flushTransformerWithLayer]);

  const handleDragStart = useCallback(() => {
    setDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragMoveRafRef.current != null) {
      cancelAnimationFrame(dragMoveRafRef.current);
      dragMoveRafRef.current = null;
    }
    const node = groupRef.current;
    if (node) {
      onDragEnd(item.id, node.x(), node.y());
    }
    flushTransformerWithLayer();
    setDragging(false);
  }, [item.id, onDragEnd, flushTransformerWithLayer]);

  const handleTransformEnd = useCallback(() => {
    const node = groupRef.current;
    if (!node) return;
    node.scaleX(1);
    node.scaleY(1);
    onTransformEnd(item.id, node.x(), node.y(), node.rotation());
  }, [item.id, onTransformEnd]);

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
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
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
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
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
              perfectDrawEnabled={false}
            />
            <Line
              points={[w + CORNER, 0, w, 0, w, -CORNER]}
              stroke="#64748b"
              strokeWidth={CORNER_STROKE}
              lineCap="round"
              lineJoin="round"
              perfectDrawEnabled={false}
            />
            <Line
              points={[w + CORNER, h, w, h, w, h + CORNER]}
              stroke="#64748b"
              strokeWidth={CORNER_STROKE}
              lineCap="round"
              lineJoin="round"
              perfectDrawEnabled={false}
            />
            <Line
              points={[-CORNER, h, 0, h, 0, h + CORNER]}
              stroke="#64748b"
              strokeWidth={CORNER_STROKE}
              lineCap="round"
              lineJoin="round"
              perfectDrawEnabled={false}
            />
          </Group>
        )}

        {isSelected && (
          <Group
            name="furniture-selection-toolbar"
            x={closeX}
            y={closeY}
            listening={interactive}
            onPointerDown={stopPointerBubble}
            onMouseDown={stopPointerBubble}
            onTouchStart={stopPointerBubble}
            onClick={handleInsetDeselect}
            onTap={handleInsetDeselect}
          >
            <Rect
              x={0}
              y={0}
              width={CLOSE_HIT}
              height={CLOSE_HIT}
              fill="rgba(15, 23, 42, 0.35)"
              cornerRadius={4}
              perfectDrawEnabled={false}
            />
            <Text
              x={0}
              y={0}
              width={CLOSE_HIT}
              height={CLOSE_HIT}
              text="×"
              fontSize={14}
              fontStyle="bold"
              fill="rgba(255,255,255,0.95)"
              align="center"
              verticalAlign="middle"
            />
          </Group>
        )}
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          listening={interactive}
          rotateEnabled
          rotationSnaps={ROTATION_SNAPS}
          enabledAnchors={[]}
          borderEnabled
          borderStroke="#64748b"
          borderStrokeWidth={1}
          borderDash={BORDER_DASH}
          padding={8}
          boundBoxFunc={BOUND_BOX_PASSTHROUGH}
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
