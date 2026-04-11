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

/** Pixels: below this, rotation handle counts as a click (+90° snap). */
const ROT_HANDLE_CLICK_MAX_PX = 6;
/** Degrees: if Konva changed rotation more than this, treat as drag (not click). */
const ROT_HANDLE_CLICK_MAX_DEG = 4;

/**
 * While dragging, omit x/y props so any stray React reconciliation cannot snap the node back to stale state.
 * Transformer + layer batchDraw on dragMove keeps selection chrome in sync with the node (Konva otherwise can lag a frame).
 */
function FurnitureItemInner({
  item,
  isSelected,
  panMode = false,
  onSelect,
  onDelete,
  onDragEnd,
  onTransformEnd,
}) {
  const groupRef = useRef(null);
  const trRef = useRef(null);
  const dragMoveRafRef = useRef(null);
  const rotHandleMaxDistRef = useRef(0);
  const rotHandleStartRotationRef = useRef(0);
  const rotHandleTrackingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const interactive = !panMode;

  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    } else if (!isSelected && trRef.current) {
      trRef.current.nodes([]);
    }
  }, [isSelected, item.width, item.height, item.rotation, item.fillColor]);

  /** Pointer travel on the rotation anchor: distinguish click (+90°) vs drag (free rotate). */
  useEffect(() => {
    if (!isSelected || !interactive) return;
    const tr = trRef.current;
    const group = groupRef.current;
    if (!tr || !group) return;

    const rotater = tr.findOne('.rotater');
    if (!rotater) return;

    const clientFromEvt = (evt) => {
      if (!evt) return { x: 0, y: 0 };
      const t = evt.touches?.[0] ?? evt.changedTouches?.[0];
      if (evt.clientX != null) return { x: evt.clientX, y: evt.clientY };
      if (t) return { x: t.clientX, y: t.clientY };
      return { x: 0, y: 0 };
    };

    let startX = 0;
    let startY = 0;

    const clientFromMoveEvt = (ev) => {
      const t = ev.touches?.[0];
      if (t) return { x: t.clientX, y: t.clientY };
      if (ev.clientX != null) return { x: ev.clientX, y: ev.clientY };
      return { x: 0, y: 0 };
    };

    const onMoveWin = (ev) => {
      if (!rotHandleTrackingRef.current) return;
      const c = clientFromMoveEvt(ev);
      const d = Math.hypot(c.x - startX, c.y - startY);
      if (d > rotHandleMaxDistRef.current) rotHandleMaxDistRef.current = d;
    };

    const onUpWin = () => {
      rotHandleTrackingRef.current = false;
      window.removeEventListener('mousemove', onMoveWin);
      window.removeEventListener('touchmove', onMoveWin);
      window.removeEventListener('mouseup', onUpWin, true);
      window.removeEventListener('touchend', onUpWin, true);
      window.removeEventListener('touchcancel', onUpWin, true);
    };

    const onRotaterDown = (e) => {
      rotHandleTrackingRef.current = true;
      rotHandleMaxDistRef.current = 0;
      rotHandleStartRotationRef.current = group.rotation();
      const c = clientFromEvt(e.evt);
      startX = c.x;
      startY = c.y;
      window.addEventListener('mousemove', onMoveWin);
      window.addEventListener('touchmove', onMoveWin, { passive: true });
      window.addEventListener('mouseup', onUpWin, true);
      window.addEventListener('touchend', onUpWin, true);
      window.addEventListener('touchcancel', onUpWin, true);
    };

    rotater.on('mousedown touchstart', onRotaterDown);
    return () => {
      rotater.off('mousedown touchstart', onRotaterDown);
      onUpWin();
    };
  }, [isSelected, interactive, item.width, item.height, item.rotation]);

  const fill = item.fillColor ?? defaultFillColorForType(item.type);

  const stopPointerBubble = (e) => {
    e.cancelBubble = true;
  };

  const handleInsetDelete = useCallback(
    (e) => {
      e.cancelBubble = true;
      if (e.evt && typeof e.evt.stopPropagation === 'function') {
        e.evt.stopPropagation();
      }
      onDelete();
    },
    [onDelete]
  );

  const w = item.width;
  const h = item.height;

  const closeX = w - CLOSE_HIT - INSET;
  const closeY = INSET;

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
    const tr = trRef.current;
    if (!node) return;
    node.scaleX(1);
    node.scaleY(1);

    const anchor = tr?.getActiveAnchor?.();
    const dist = rotHandleMaxDistRef.current;
    const startRot = rotHandleStartRotationRef.current;
    const endRot = node.rotation();
    rotHandleMaxDistRef.current = 0;

    let rotationOut = endRot;
    if (
      anchor === 'rotater' &&
      dist < ROT_HANDLE_CLICK_MAX_PX &&
      Math.abs(endRot - startRot) < ROT_HANDLE_CLICK_MAX_DEG
    ) {
      rotationOut = startRot + 90;
      rotationOut = ((rotationOut % 360) + 360) % 360;
      node.rotation(rotationOut);
      tr?.forceUpdate?.();
    }

    onTransformEnd(item.id, node.x(), node.y(), rotationOut);
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
            onClick={handleInsetDelete}
            onTap={handleInsetDelete}
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
