import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { Stage, Layer, Group, Image as KonvaImage } from 'react-konva';
import useImage from './hooks/useImage';
import { useFurnitureUndoRedo } from './hooks/useFurnitureUndoRedo';
import { sortFurnitureForCanvas } from './utils/furnitureRenderOrder';
import { serializeProject, parseProjectFile, normalizeCustomPreset } from './utils/projectFile';
import { defaultFillColorForType } from './utils/furnitureColors';
import { clampScale, stageToWorld } from './utils/canvasViewMath';
import Toolbar from './components/Toolbar';
import FurnitureItem from './components/FurnitureItem';
import CalibrationLine from './components/CalibrationLine';
import CalibrationModal from './components/CalibrationModal';
import ClearConfirmModal from './components/ClearConfirmModal';
import FurniturePanel from './components/FurniturePanel';
import TemplatesModal from './components/TemplatesModal';
import './App.css';

const MAP_ZOOM_STEP = 1.1;

const LS_FLOOR_PLAN = 'floorPlanImage';
const LS_PIXELS_PER_INCH = 'pixelsPerInch';
const LS_CUSTOM_PRESETS = 'customPresets';

function readStoredFloorPlanUrl() {
  if (typeof localStorage === 'undefined') return null;
  const v = localStorage.getItem(LS_FLOOR_PLAN);
  return v && v.length > 0 ? v : null;
}

function readStoredPpi() {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(LS_PIXELS_PER_INCH);
  if (raw == null || raw === '') return null;
  const n = parseFloat(raw);
  if (Number.isNaN(n) || n <= 0) return null;
  return n;
}

function readStoredCustomPresets() {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(LS_CUSTOM_PRESETS);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const out = [];
    arr.forEach((item, i) => {
      try {
        out.push(normalizeCustomPreset(item, i));
      } catch {
        /* skip invalid row */
      }
    });
    return out;
  } catch {
    return [];
  }
}

function App() {
  const [floorPlanUrl, setFloorPlanUrl] = useState(readStoredFloorPlanUrl);
  const [floorPlanImage] = useImage(floorPlanUrl);
  const {
    furniture,
    commitFurniture,
    undo,
    redo,
    canUndo,
    canRedo,
    resetAll: resetFurnitureUndo,
    loadSnapshot,
  } = useFurnitureUndoRedo();
  const [selectedId, setSelectedId] = useState(null);
  const [pixelsPerInch, setPixelsPerInch] = useState(readStoredPpi); // Core calibration value
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationLine, setCalibrationLine] = useState(null);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  /** Transient success message shown over the canvas after calibration. */
  const [calibrationToast, setCalibrationToast] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [viewX, setViewX] = useState(0);
  const [viewY, setViewY] = useState(0);
  const [viewScale, setViewScale] = useState(1);
  const [canvasViewLocked, setCanvasViewLocked] = useState(false);
  /** True while Space is held (not typing in a field) — grab cursor; LMB pans. */
  const [spacePanActive, setSpacePanActive] = useState(false);
  const [isPanDragging, setIsPanDragging] = useState(false);
  const [customPresets, setCustomPresets] = useState(readStoredCustomPresets);
  const stageRef = useRef(null);
  const worldGroupRef = useRef(null);
  const panDragRef = useRef(null);
  /** 'space' | 'middle' — which gesture started the active pan drag. */
  const panDragSourceRef = useRef(null);
  const canvasViewLockedRef = useRef(false);
  const viewRef = useRef({ viewX: 0, viewY: 0, viewScale: 1 });
  const fileInputRef = useRef(null);
  const projectFileInputRef = useRef(null);
  const canvasHostRef = useRef(null);
  const lastCanvasObservedRef = useRef({ w: 0, h: 0 });
  const prevSelectedIdForLogRef = useRef(null);
  const calibrationToastTimerRef = useRef(null);

  useEffect(() => {
    if (pixelsPerInch == null) {
      localStorage.removeItem(LS_PIXELS_PER_INCH);
    } else {
      localStorage.setItem(LS_PIXELS_PER_INCH, String(pixelsPerInch));
    }
  }, [pixelsPerInch]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_CUSTOM_PRESETS, JSON.stringify(customPresets));
    } catch {
      /* ignore quota errors */
    }
  }, [customPresets]);

  useEffect(() => {
    return () => {
      if (calibrationToastTimerRef.current != null) {
        clearTimeout(calibrationToastTimerRef.current);
        calibrationToastTimerRef.current = null;
      }
    };
  }, []);

  const clearCalibrationToast = useCallback(() => {
    if (calibrationToastTimerRef.current != null) {
      clearTimeout(calibrationToastTimerRef.current);
      calibrationToastTimerRef.current = null;
    }
    setCalibrationToast(null);
  }, []);

  // Konva Stage size follows the canvas host (excludes sidebar and bottom leaderboard slot)
  useEffect(() => {
    const el = canvasHostRef.current;
    if (!el) return;

    const applySize = (width, height) => {
      const w = Math.floor(width);
      const h = Math.floor(height);
      if (w > 0 && h > 0) {
        const prev = lastCanvasObservedRef.current;
        if (prev.w !== w || prev.h !== h) {
          lastCanvasObservedRef.current = { w, h };
          // #region agent log
          fetch('http://127.0.0.1:7687/ingest/2e6ba286-1170-4a08-829f-40c18e955fd4', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '548a6c' },
            body: JSON.stringify({
              sessionId: '548a6c',
              location: 'App.jsx:ResizeObserver',
              message: 'canvasHost size changed',
              data: { prevW: prev.w, prevH: prev.h, w, h },
              timestamp: Date.now(),
              hypothesisId: 'D',
            }),
          }).catch(() => {});
          // #endregion
        }
        setCanvasSize({ width: w, height: h });
      }
    };

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) applySize(cr.width, cr.height);
    });
    ro.observe(el);
    const br = el.getBoundingClientRect();
    applySize(br.width, br.height);

    return () => ro.disconnect();
  }, []);

  // Mobile/tablet: avoid the browser treating drags as page scroll / overscroll on the canvas
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const container = stage.container();
    container.style.touchAction = 'none';
    container.style.userSelect = 'none';
    container.style.webkitUserSelect = 'none';

    const preventTouchScroll = (ev) => {
      if (ev.cancelable) ev.preventDefault();
    };
    container.addEventListener('touchmove', preventTouchScroll, { passive: false });
    return () => {
      container.removeEventListener('touchmove', preventTouchScroll);
    };
  }, [canvasSize.width, canvasSize.height, floorPlanUrl]);

  useEffect(() => {
    canvasViewLockedRef.current = canvasViewLocked;
  }, [canvasViewLocked]);

  useEffect(() => {
    viewRef.current = { viewX, viewY, viewScale };
  }, [viewX, viewY, viewScale]);

  useEffect(() => {
    if (isPanDragging) {
      document.body.style.cursor = 'grabbing';
    } else if (spacePanActive) {
      document.body.style.cursor = 'grab';
    } else {
      document.body.style.cursor = '';
    }
    return () => {
      document.body.style.cursor = '';
    };
  }, [spacePanActive, isPanDragging]);

  /** Space hold-to-pan; preventDefault on keydown avoids page scroll. */
  useEffect(() => {
    const typingTarget = (el) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      return false;
    };

    const endSpaceSourcedPan = () => {
      if (panDragSourceRef.current !== 'space' || !panDragRef.current) return;
      const pid = panDragRef.current.pointerId;
      try {
        stageRef.current?.container().releasePointerCapture(pid);
      } catch (_) {}
      panDragRef.current = null;
      panDragSourceRef.current = null;
      setIsPanDragging(false);
    };

    const onKeyDown = (e) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (typingTarget(document.activeElement)) return;
      e.preventDefault();
      if (!e.repeat) setSpacePanActive(true);
    };

    const onKeyUp = (e) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      setSpacePanActive(false);
      endSpaceSourcedPan();
    };

    const onWindowBlur = () => {
      setSpacePanActive(false);
      endSpaceSourcedPan();
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, []);

  const resetCanvasView = useCallback(() => {
    setViewX(0);
    setViewY(0);
    setViewScale(1);
  }, []);

  /** Zoom toward canvas center (same idea as Ctrl+wheel) */
  const zoomCanvasFromCenter = useCallback(
    (direction) => {
      const w = canvasSize.width;
      const h = canvasSize.height;
      if (w <= 0 || h <= 0) return;
      const cx = w / 2;
      const cy = h / 2;
      const world = stageToWorld(cx, cy, viewX, viewY, viewScale);
      const factor = direction === 'in' ? MAP_ZOOM_STEP : 1 / MAP_ZOOM_STEP;
      const newScale = clampScale(viewScale * factor);
      setViewX(cx - world.x * newScale);
      setViewY(cy - world.y * newScale);
      setViewScale(newScale);
    },
    [canvasSize.width, canvasSize.height, viewX, viewY, viewScale]
  );

  // Two-finger pinch / pan on the stage container (DOM pointer events)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const el = stage.container();
    const pointers = new Map();

    const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

    let gesture = null;

    const fromEvent = (ev) => {
      const rect = el.getBoundingClientRect();
      return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
    };

    const onPointerDown = (ev) => {
      if (canvasViewLockedRef.current) return;
      pointers.set(ev.pointerId, fromEvent(ev));
      if (pointers.size === 2) {
        const pts = [...pointers.values()];
        const d0 = dist(pts[0], pts[1]);
        const m0 = mid(pts[0], pts[1]);
        const vr = viewRef.current;
        gesture = { startD: d0, startM: m0, startVX: vr.viewX, startVY: vr.viewY, startSc: vr.viewScale };
      }
    };

    const onPointerMove = (ev) => {
      if (canvasViewLockedRef.current) return;
      if (!pointers.has(ev.pointerId)) return;
      pointers.set(ev.pointerId, fromEvent(ev));
      if (!gesture || pointers.size < 2) return;

      const pts = [...pointers.values()];
      const d = dist(pts[0], pts[1]);
      const m = mid(pts[0], pts[1]);
      const { startD, startM, startVX, startVY, startSc } = gesture;

      const newScale = clampScale(startSc * (d / startD));
      const world = stageToWorld(startM.x, startM.y, startVX, startVY, startSc);
      let nx = startM.x - world.x * newScale;
      let ny = startM.y - world.y * newScale;
      nx += m.x - startM.x;
      ny += m.y - startM.y;

      setViewX(nx);
      setViewY(ny);
      setViewScale(newScale);
      if (ev.cancelable) ev.preventDefault();
    };

    const onPointerUp = (ev) => {
      pointers.delete(ev.pointerId);
      if (pointers.size < 2) gesture = null;
    };

    const onWheelChrome = (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && !canvasViewLockedRef.current && ev.cancelable) {
        ev.preventDefault();
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove, { passive: false });
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('wheel', onWheelChrome, { passive: false });

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('wheel', onWheelChrome);
    };
  }, [canvasSize.width, canvasSize.height, floorPlanUrl]);


  // Handle file upload

  const handleFileUpload = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setFloorPlanUrl(dataUrl);
      localStorage.setItem(LS_FLOOR_PLAN, dataUrl);
      resetCanvasView();
    };
    reader.readAsDataURL(file);
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Start calibration mode
  const startCalibration = () => {
    setSpacePanActive(false);
    setIsCalibrating(true);
    setCalibrationLine(null);
  };

  // Handle calibration line drawing on stage click
  const handleStageClick = (e) => {
    if (!isCalibrating) return;

    const pos = worldGroupRef.current?.getRelativePointerPosition();
    if (!pos) return;

    if (!calibrationLine) {
      setCalibrationLine({ start: pos, end: pos, phase: 'drawing' });
    } else if (calibrationLine.phase === 'drawing') {
      setCalibrationLine({ ...calibrationLine, end: pos, phase: 'locked' });
      setShowCalibrationModal(true);
    }
  };

  // Pointer / mouse / touch move during calibration (live preview of line end)
  const handleStagePointerMove = (e) => {
    if (!isCalibrating || !calibrationLine || calibrationLine.phase !== 'drawing') return;

    const pos = worldGroupRef.current?.getRelativePointerPosition();
    if (!pos) return;
    setCalibrationLine({ ...calibrationLine, end: pos });
  };

  // Calculate pixels per inch from calibration
  const handleCalibrationSubmit = (feet, inches) => {
    if (!calibrationLine) return;

    const totalInches = feet * 12 + inches;
    const lineLength = Math.sqrt(
      Math.pow(calibrationLine.end.x - calibrationLine.start.x, 2) +
      Math.pow(calibrationLine.end.y - calibrationLine.start.y, 2)
    );

    /**
     * SCALE CALCULATION:
     * pixelsPerInch = total pixels in drawn line / total inches in real world
     * This ratio is used to convert all real-world dimensions to canvas pixels
     */
    const ppi = lineLength / totalInches;
    setPixelsPerInch(ppi);
    setIsCalibrating(false);
    setCalibrationLine(null);
    setShowCalibrationModal(false);
    if (calibrationToastTimerRef.current != null) {
      clearTimeout(calibrationToastTimerRef.current);
      calibrationToastTimerRef.current = null;
    }
    setCalibrationToast(`Calibration set! ${ppi.toFixed(2)} pixels per inch`);
    calibrationToastTimerRef.current = window.setTimeout(() => {
      calibrationToastTimerRef.current = null;
      setCalibrationToast(null);
    }, 3000);
  };

  // Add furniture item
  const addFurniture = (type, widthFeet, widthInches, depthFeet, depthInches, fillColor) => {
    if (!pixelsPerInch) {
      alert('Please calibrate the floor plan first!');
      return;
    }

    const totalWidthInches = widthFeet * 12 + widthInches;
    const totalDepthInches = depthFeet * 12 + depthInches;
    const hex =
      typeof fillColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(fillColor.trim())
        ? fillColor.trim()
        : defaultFillColorForType(type);

    /**
     * FURNITURE SIZE CALCULATION:
     * Canvas width = real width in inches × pixelsPerInch
     * Canvas height = real depth in inches × pixelsPerInch
     */
    const cx = (canvasSize.width / 2 - viewX) / viewScale;
    const cy = (canvasSize.height / 2 - viewY) / viewScale;
    const newItem = {
      id: Date.now().toString(),
      type,
      x: cx,
      y: cy,
      width: totalWidthInches * pixelsPerInch,
      height: totalDepthInches * pixelsPerInch,
      rotation: 0,
      realWidth: { feet: widthFeet, inches: widthInches },
      realDepth: { feet: depthFeet, inches: depthInches },
      fillColor: hex,
    };

    commitFurniture((prev) => [...prev, newItem]);
  };

  // Update furniture dimensions
  const updateFurniture = (id, widthFeet, widthInches, depthFeet, depthInches) => {
    const totalWidthInches = widthFeet * 12 + widthInches;
    const totalDepthInches = depthFeet * 12 + depthInches;

    commitFurniture((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              width: totalWidthInches * pixelsPerInch,
              height: totalDepthInches * pixelsPerInch,
              realWidth: { feet: widthFeet, inches: widthInches },
              realDepth: { feet: depthFeet, inches: depthInches },
            }
          : item
      )
    );
  };

  const updateFurnitureColor = useCallback(
    (id, fillColor) => {
      const hex = typeof fillColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(fillColor.trim()) ? fillColor.trim() : null;
      if (!hex) return;
      commitFurniture((prev) =>
        prev.map((item) => (item.id === id ? { ...item, fillColor: hex } : item))
      );
    },
    [commitFurniture]
  );

  const deleteFurniture = useCallback(
    (id) => {
      commitFurniture((prev) => prev.filter((item) => item.id !== id));
      setSelectedId((sel) => (sel === id ? null : sel));
    },
    [commitFurniture]
  );

  const addCustomPreset = useCallback((entry) => {
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : String(Date.now());
    const hex =
      typeof entry.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(String(entry.color).trim())
        ? String(entry.color).trim()
        : '#8B7355';
    setCustomPresets((prev) => [
      ...prev,
      {
        id,
        name: String(entry.name ?? '').trim() || 'Custom',
        width: { ...entry.width },
        depth: { ...entry.depth },
        color: hex,
      },
    ]);
  }, []);

  const deleteCustomPreset = useCallback((id) => {
    setCustomPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const hasCanvasContent = !!floorPlanUrl || furniture.length > 0;

  const confirmClearCanvas = useCallback(() => {
    localStorage.removeItem(LS_FLOOR_PLAN);
    localStorage.removeItem(LS_PIXELS_PER_INCH);
    localStorage.removeItem(LS_CUSTOM_PRESETS);
    setFloorPlanUrl(null);
    resetFurnitureUndo();
    setSelectedId(null);
    setPixelsPerInch(null);
    setCustomPresets([]);
    setIsCalibrating(false);
    setCalibrationLine(null);
    clearCalibrationToast();
    setShowCalibrationModal(false);
    setShowClearConfirm(false);
    resetCanvasView();
  }, [resetFurnitureUndo, resetCanvasView, clearCalibrationToast]);

  const handleExportPlan = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const pixelRatio = Math.min(3, Math.max(2, dpr * 1.5));
    const dataUrl = stage.toDataURL({
      mimeType: 'image/png',
      quality: 1,
      pixelRatio,
    });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'my-floorplan.png';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  const applyProjectSnapshot = useCallback(
    (data) => {
      setShowCalibrationModal(false);
      setShowClearConfirm(false);
      setShowTemplatesModal(false);
      setIsCalibrating(false);
      setCalibrationLine(null);
      clearCalibrationToast();
      setSelectedId(null);

      if (data.floorPlanImage) {
        setFloorPlanUrl(data.floorPlanImage);
        localStorage.setItem(LS_FLOOR_PLAN, data.floorPlanImage);
      } else {
        setFloorPlanUrl(null);
        localStorage.removeItem(LS_FLOOR_PLAN);
      }

      setPixelsPerInch(data.pixelsPerInch);
      loadSnapshot(data.furniture);
      setCustomPresets(Array.isArray(data.customPresets) ? data.customPresets : []);
      resetCanvasView();
    },
    [loadSnapshot, resetCanvasView, clearCalibrationToast]
  );

  const handleSelectTemplate = useCallback(
    (template) => {
      try {
        const data = parseProjectFile(JSON.stringify(template.payload));
        applyProjectSnapshot(data);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Could not load template');
      }
    },
    [applyProjectSnapshot]
  );

  const handleSaveProject = useCallback(() => {
    const json = serializeProject(floorPlanUrl, pixelsPerInch, furniture, customPresets);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-floorplan.json';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [floorPlanUrl, pixelsPerInch, furniture, customPresets]);

  const handleLoadProjectClick = useCallback(() => {
    projectFileInputRef.current?.click();
  }, []);

  const handleProjectFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = String(ev.target?.result ?? '');
          const data = parseProjectFile(text);
          applyProjectSnapshot(data);
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Could not load project file');
        }
      };
      reader.readAsText(file);
    },
    [applyProjectSnapshot]
  );

  /** Positions come from the item's Konva group ref — stable IDs and flushSync avoid snap-back after drag. */
  const handleFurnitureDragEnd = useCallback((id, x, y) => {
    flushSync(() => {
      commitFurniture((prev) =>
        prev.map((f) => (String(f.id) === String(id) ? { ...f, x, y } : f))
      );
    });
  }, [commitFurniture]);

  const handleFurnitureTransformEnd = useCallback((id, x, y, rotation) => {
    flushSync(() => {
      commitFurniture((prev) =>
        prev.map((f) =>
          String(f.id) === String(id)
            ? { ...f, x, y, rotation }
            : f
        )
      );
    });
  }, [commitFurniture]);

  /** True if Konva event target is a node under a Group named "furniture". */
  const eventTargetIsFurniture = useCallback((e) => {
    let node = e.target;
    while (node) {
      const nm = typeof node.name === 'function' ? node.name() : '';
      if (nm === 'furniture') return true;
      node = node.getParent?.();
    }
    return false;
  }, []);

  useLayoutEffect(() => {
    if (prevSelectedIdForLogRef.current === selectedId) return;
    const from = prevSelectedIdForLogRef.current;
    prevSelectedIdForLogRef.current = selectedId;
    // #region agent log
    fetch('http://127.0.0.1:7687/ingest/2e6ba286-1170-4a08-829f-40c18e955fd4', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '548a6c' },
      body: JSON.stringify({
        sessionId: '548a6c',
        location: 'App.jsx:useLayoutEffect(selection)',
        message: 'selectedId changed',
        data: {
          from,
          to: selectedId,
          viewX,
          viewY,
          viewScale,
          canvasW: canvasSize.width,
          canvasH: canvasSize.height,
        },
        timestamp: Date.now(),
        hypothesisId: 'C',
      }),
    }).catch(() => {});
    // #endregion
  }, [selectedId, viewX, viewY, viewScale, canvasSize.width, canvasSize.height]);

  // Deselect when tapping floor / empty canvas (not when calibrating)
  const handleStageSurfaceDown = (e) => {
    if (isCalibrating) return;
    const target = e.target;
    const nodeName = typeof target.name === 'function' ? target.name() : '';
    if (nodeName === 'floor-plan') {
      setSelectedId(null);
      return;
    }
    const cls = target.getClassName?.();
    if (cls === 'Stage' || cls === 'Layer') {
      setSelectedId(null);
    }
  };

  const startCanvasPanDrag = (e, source) => {
    e.evt.preventDefault();
    panDragSourceRef.current = source;
    panDragRef.current = {
      pointerId: e.evt.pointerId,
      lastX: e.evt.clientX,
      lastY: e.evt.clientY,
    };
    setIsPanDragging(true);
    try {
      stageRef.current?.container().setPointerCapture(e.evt.pointerId);
    } catch (_) {}
  };

  const handleCanvasPointerDown = (e) => {
    const onFurniture = eventTargetIsFurniture(e);
    const btn = e.evt.button;
    // #region agent log
    fetch('http://127.0.0.1:7687/ingest/2e6ba286-1170-4a08-829f-40c18e955fd4', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '548a6c' },
      body: JSON.stringify({
        sessionId: '548a6c',
        location: 'App.jsx:handleCanvasPointerDown',
        message: 'stage pointer down',
        data: { onFurniture, button: btn, spacePanActive, canvasViewLocked, isCalibrating },
        timestamp: Date.now(),
        hypothesisId: 'B',
      }),
    }).catch(() => {});
    // #endregion
    if (canvasViewLocked || isCalibrating) {
      handleStageSurfaceDown(e);
      return;
    }
    if (btn === 1) {
      startCanvasPanDrag(e, 'middle');
      return;
    }
    if (spacePanActive && btn === 0) {
      if (!onFurniture) startCanvasPanDrag(e, 'space');
      return;
    }
    if (!onFurniture) {
      handleStageSurfaceDown(e);
    }
  };

  const handleCanvasPointerMove = (e) => {
    if (panDragRef.current && panDragRef.current.pointerId === e.evt.pointerId) {
      const pr = panDragRef.current;
      const dx = e.evt.clientX - pr.lastX;
      const dy = e.evt.clientY - pr.lastY;
      pr.lastX = e.evt.clientX;
      pr.lastY = e.evt.clientY;
      setViewX((x) => x + dx);
      setViewY((y) => y + dy);
      return;
    }
    handleStagePointerMove(e);
  };

  const handleCanvasPointerUp = (e) => {
    if (panDragRef.current?.pointerId === e.evt.pointerId) {
      panDragRef.current = null;
      panDragSourceRef.current = null;
      setIsPanDragging(false);
      try {
        stageRef.current?.container().releasePointerCapture(e.evt.pointerId);
      } catch (_) {}
    }
  };

  const handleCanvasWheel = (e) => {
    if (canvasViewLocked) return;
    if (!e.evt.ctrlKey && !e.evt.metaKey) return;
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const delta = e.evt.deltaY;
    const factor = delta > 0 ? 0.92 : 1.08;
    setViewScale((prevScale) => {
      const newScale = clampScale(prevScale * factor);
      setViewX((vx) => pos.x - ((pos.x - vx) / prevScale) * newScale);
      setViewY((vy) => pos.y - ((pos.y - vy) / prevScale) * newScale);
      return newScale;
    });
  };

  // Drop selection if the selected item no longer exists (e.g. after undo)
  useEffect(() => {
    setSelectedId((sel) => {
      if (sel == null) return sel;
      return furniture.some((f) => String(f.id) === String(sel)) ? sel : null;
    });
  }, [furniture]);

  // Undo/Redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z) and delete (Backspace/Delete); skip when typing in fields
  useEffect(() => {
    const onKeyDown = (ev) => {
      const el = document.activeElement;
      if (el) {
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (el.isContentEditable) return;
      }

      const meta = ev.metaKey || ev.ctrlKey;
      if (meta && ev.key.toLowerCase() === 'z') {
        ev.preventDefault();
        if (ev.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (ev.key !== 'Backspace' && ev.key !== 'Delete') return;
      if (!selectedId) return;
      ev.preventDefault();
      deleteFurniture(selectedId);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, deleteFurniture, undo, redo]);

  const selectedFurniture = useMemo(
    () =>
      selectedId == null
        ? undefined
        : furniture.find((f) => String(f.id) === String(selectedId)),
    [furniture, selectedId]
  );

  const furnitureForCanvas = useMemo(
    () => sortFurnitureForCanvas(furniture),
    [furniture]
  );

  return (
    <div
      className="app"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
      <input
        ref={projectFileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleProjectFileChange}
        style={{ display: 'none' }}
      />

      <div className="app-shell">
        <Toolbar
          onStartCalibration={startCalibration}
          isCalibrated={!!pixelsPerInch}
          pixelsPerInch={pixelsPerInch}
          onUploadFloorPlan={() => fileInputRef.current?.click()}
          hasFloorPlan={!!floorPlanUrl}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onClearCanvas={() => setShowClearConfirm(true)}
          onExportPlan={handleExportPlan}
          onSaveProject={handleSaveProject}
          onLoadProject={handleLoadProjectClick}
          onOpenTemplates={() => setShowTemplatesModal(true)}
          canClearCanvas={hasCanvasContent}
          canExportPlan={hasCanvasContent}
        />

        <div className="app-main">
          <div className="canvas-column">
            <div
              ref={canvasHostRef}
              className={`canvas-host${spacePanActive || isPanDragging ? ' canvas-host--pan-mode' : ''}`}
            >
              <Stage
                ref={stageRef}
                width={canvasSize.width}
                height={canvasSize.height}
                onClick={handleStageClick}
                onTap={handleStageClick}
                onWheel={handleCanvasWheel}
                onContextMenu={(e) => e.evt.preventDefault()}
                {...(typeof PointerEvent !== 'undefined'
                  ? {
                      onPointerDown: handleCanvasPointerDown,
                      onPointerMove: handleCanvasPointerMove,
                      onPointerUp: handleCanvasPointerUp,
                      onPointerCancel: handleCanvasPointerUp,
                    }
                  : {
                      onMouseDown: handleCanvasPointerDown,
                      onMouseMove: handleCanvasPointerMove,
                      onMouseUp: handleCanvasPointerUp,
                      onTouchStart: handleCanvasPointerDown,
                      onTouchMove: handleCanvasPointerMove,
                      onTouchEnd: handleCanvasPointerUp,
                    })}
                style={{
                  cursor: isCalibrating
                    ? 'crosshair'
                    : isPanDragging
                      ? 'grabbing'
                      : spacePanActive
                        ? 'grab'
                        : 'default',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
              >
                <Layer>
                  <Group
                    ref={worldGroupRef}
                    name="world"
                    x={viewX}
                    y={viewY}
                    scaleX={viewScale}
                    scaleY={viewScale}
                  >
                    {floorPlanImage && (
                      <KonvaImage
                        name="floor-plan"
                        image={floorPlanImage}
                        x={0}
                        y={0}
                        listening
                      />
                    )}

                    {isCalibrating && calibrationLine && (
                      <CalibrationLine line={calibrationLine} />
                    )}

                    {furnitureForCanvas.map((item) => (
                      <FurnitureItem
                        key={item.id}
                        item={item}
                        isSelected={String(item.id) === String(selectedId)}
                        panMode={spacePanActive || isPanDragging}
                        onSelect={() => setSelectedId(item.id)}
                        onDelete={() => deleteFurniture(item.id)}
                        onDragEnd={handleFurnitureDragEnd}
                        onTransformEnd={handleFurnitureTransformEnd}
                      />
                    ))}
                  </Group>
                </Layer>
              </Stage>
              {calibrationToast && (
                <div
                  className="calibration-toast"
                  role="status"
                  aria-live="polite"
                >
                  <span className="calibration-toast__icon" aria-hidden>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                  <span>{calibrationToast}</span>
                </div>
              )}
              {(spacePanActive || isPanDragging) && (
                <div className="canvas-pan-mode-toast" role="status">
                  Pan — drag to move the view.
                </div>
              )}
              <div
                className="canvas-map-controls"
                role="toolbar"
                aria-label="Canvas navigation"
              >
                <button
                  type="button"
                  className="canvas-map-controls__lock"
                  onClick={() => setCanvasViewLocked((v) => !v)}
                  aria-pressed={canvasViewLocked}
                  title="Lock/Unlock background. Hold Spacebar or Middle-Mouse click to pan."
                  aria-label={
                    canvasViewLocked
                      ? 'Unlock background panning and zooming'
                      : 'Lock background panning and zooming'
                  }
                >
                  {canvasViewLocked ? (
                    <svg
                      className="canvas-map-controls__icon"
                      viewBox="0 0 24 24"
                      width="22"
                      height="22"
                      aria-hidden
                    >
                      <rect
                        x="5"
                        y="11"
                        width="14"
                        height="10"
                        rx="1.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                      />
                      <path
                        d="M8 11V8a4 4 0 0 1 8 0v3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="canvas-map-controls__icon"
                      viewBox="0 0 24 24"
                      width="22"
                      height="22"
                      aria-hidden
                    >
                      <rect
                        x="5"
                        y="11"
                        width="14"
                        height="10"
                        rx="1.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                      />
                      <path
                        d="M8 11V8a4 4 0 0 1 7.5-2.2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                      />
                      <path
                        d="M16 5.5V8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  className="canvas-map-controls__recenter"
                  onClick={resetCanvasView}
                  title="Recenter view"
                  aria-label="Recenter view"
                >
                  <svg
                    className="canvas-map-controls__icon"
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    aria-hidden
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                    />
                    <line
                      x1="12"
                      y1="3"
                      x2="12"
                      y2="6.5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                    <line
                      x1="12"
                      y1="17.5"
                      x2="12"
                      y2="21"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                    <line
                      x1="3"
                      y1="12"
                      x2="6.5"
                      y2="12"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                    <line
                      x1="17.5"
                      y1="12"
                      x2="21"
                      y2="12"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                  </svg>
                </button>
                <div className="canvas-map-controls__zoom-pill">
                  <button
                    type="button"
                    className="canvas-map-controls__zoom-btn"
                    onClick={() => zoomCanvasFromCenter('in')}
                    title="Zoom in"
                    aria-label="Zoom in"
                  >
                    <span aria-hidden>+</span>
                  </button>
                  <div className="canvas-map-controls__zoom-divider" aria-hidden />
                  <button
                    type="button"
                    className="canvas-map-controls__zoom-btn"
                    onClick={() => zoomCanvasFromCenter('out')}
                    title="Zoom out"
                    aria-label="Zoom out"
                  >
                    <span aria-hidden>−</span>
                  </button>
                </div>
              </div>
              {!floorPlanUrl && !isDraggingFile && (
                <div className="no-floorplan">
                  <div className="upload-prompt">
                    <h2>Upload a Floor Plan to Get Started</h2>
                    <p>Drag and drop an image here or click the button below</p>
                    <p className="upload-hint">
                      Hold Spacebar or middle-click drag to pan the view. Ctrl+scroll to zoom.
                    </p>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="upload-btn">
                      Choose Floor Plan Image
                    </button>
                  </div>
                </div>
              )}
            </div>

            <aside
              className="ad-slot ad-slot--leaderboard"
              data-ad-slot="leaderboard"
              aria-label="Advertisement"
            >
              Advertisement
            </aside>
          </div>

          <aside className="sidebar-column">
            <FurniturePanel
              onAddFurniture={addFurniture}
              customPresets={customPresets}
              onSaveCustomPreset={addCustomPreset}
              onDeleteCustomPreset={deleteCustomPreset}
              selectedFurniture={selectedFurniture}
              onUpdateFurniture={updateFurniture}
              onUpdateFurnitureColor={updateFurnitureColor}
              onDeleteFurniture={deleteFurniture}
              isCalibrated={!!pixelsPerInch}
              hasFloorPlan={!!floorPlanUrl}
              onStartCalibration={startCalibration}
            />
          </aside>
        </div>
      </div>

      {isDraggingFile && (
        <div className="drop-overlay">
          <div className="drop-message">
            <p>Drop floor plan image here</p>
          </div>
        </div>
      )}

      {showCalibrationModal && (
        <CalibrationModal
          onSubmit={handleCalibrationSubmit}
          onCancel={() => {
            clearCalibrationToast();
            setShowCalibrationModal(false);
            setCalibrationLine(null);
            setIsCalibrating(false);
          }}
        />
      )}

      {showTemplatesModal && (
        <TemplatesModal
          onClose={() => setShowTemplatesModal(false)}
          onSelectTemplate={handleSelectTemplate}
        />
      )}

      {showClearConfirm && (
        <ClearConfirmModal
          onCancel={() => setShowClearConfirm(false)}
          onConfirm={confirmClearCanvas}
        />
      )}
    </div>
  );
}

export default App;
