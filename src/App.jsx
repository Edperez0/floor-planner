import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Group, Image as KonvaImage } from 'react-konva';
import useImage from './hooks/useImage';
import { useFurnitureUndoRedo } from './hooks/useFurnitureUndoRedo';
import { sortFurnitureForCanvas } from './utils/furnitureRenderOrder';
import { serializeProject, parseProjectFile } from './utils/projectFile';
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

function App() {
  const [floorPlanUrl, setFloorPlanUrl] = useState(null);
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
  const [pixelsPerInch, setPixelsPerInch] = useState(null); // Core calibration value
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationLine, setCalibrationLine] = useState(null);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [viewX, setViewX] = useState(0);
  const [viewY, setViewY] = useState(0);
  const [viewScale, setViewScale] = useState(1);
  const [canvasViewLocked, setCanvasViewLocked] = useState(false);
  const [isRightPanning, setIsRightPanning] = useState(false);
  const stageRef = useRef(null);
  const worldGroupRef = useRef(null);
  const rightPanRef = useRef(null);
  const canvasViewLockedRef = useRef(false);
  const viewRef = useRef({ viewX: 0, viewY: 0, viewScale: 1 });
  const fileInputRef = useRef(null);
  const projectFileInputRef = useRef(null);
  const canvasHostRef = useRef(null);

  // Load floor plan from localStorage on mount
  useEffect(() => {
    const savedFloorPlan = localStorage.getItem('floorPlanImage');
    if (savedFloorPlan) {
      setFloorPlanUrl(savedFloorPlan);
    }
  }, []);

  // Konva Stage size follows the canvas host (excludes sidebar and bottom leaderboard slot)
  useEffect(() => {
    const el = canvasHostRef.current;
    if (!el) return;

    const applySize = (width, height) => {
      const w = Math.floor(width);
      const h = Math.floor(height);
      if (w > 0 && h > 0) {
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

  const resetCanvasView = useCallback(() => {
    setViewX(0);
    setViewY(0);
    setViewScale(1);
  }, []);

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
      localStorage.setItem('floorPlanImage', dataUrl);
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
    alert(`Calibration set! ${ppi.toFixed(2)} pixels per inch`);
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

  const hasCanvasContent = !!floorPlanUrl || furniture.length > 0;

  const confirmClearCanvas = useCallback(() => {
    localStorage.removeItem('floorPlanImage');
    setFloorPlanUrl(null);
    resetFurnitureUndo();
    setSelectedId(null);
    setPixelsPerInch(null);
    setIsCalibrating(false);
    setCalibrationLine(null);
    setShowCalibrationModal(false);
    setShowClearConfirm(false);
    resetCanvasView();
  }, [resetFurnitureUndo, resetCanvasView]);

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
      setSelectedId(null);

      if (data.floorPlanImage) {
        setFloorPlanUrl(data.floorPlanImage);
        localStorage.setItem('floorPlanImage', data.floorPlanImage);
      } else {
        setFloorPlanUrl(null);
        localStorage.removeItem('floorPlanImage');
      }

      setPixelsPerInch(data.pixelsPerInch);
      loadSnapshot(data.furniture);
      resetCanvasView();
    },
    [loadSnapshot, resetCanvasView]
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
    const json = serializeProject(floorPlanUrl, pixelsPerInch, furniture);
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
  }, [floorPlanUrl, pixelsPerInch, furniture]);

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

  // Handle furniture drag
  const handleDragEnd = (id, e) => {
    const node = e.target;
    commitFurniture((prev) =>
      prev.map((f) => (f.id === id ? { ...f, x: node.x(), y: node.y() } : f))
    );
  };

  // Rotation / move only — dimensions stay tied to calibration (panel updates size)
  const handleTransformEnd = (id, e) => {
    const node = e.target;
    node.scaleX(1);
    node.scaleY(1);

    commitFurniture((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              x: node.x(),
              y: node.y(),
              rotation: node.rotation(),
            }
          : f
      )
    );
  };

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

  const handleCanvasPointerDown = (e) => {
    if (!canvasViewLocked && e.evt.button === 2) {
      e.evt.preventDefault();
      rightPanRef.current = {
        pointerId: e.evt.pointerId,
        lastX: e.evt.clientX,
        lastY: e.evt.clientY,
      };
      setIsRightPanning(true);
      try {
        stageRef.current?.container().setPointerCapture(e.evt.pointerId);
      } catch (_) {}
      return;
    }
    handleStageSurfaceDown(e);
  };

  const handleCanvasPointerMove = (e) => {
    if (!canvasViewLocked && rightPanRef.current && rightPanRef.current.pointerId === e.evt.pointerId) {
      const pr = rightPanRef.current;
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
    if (rightPanRef.current?.pointerId === e.evt.pointerId) {
      rightPanRef.current = null;
      setIsRightPanning(false);
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
      return furniture.some((f) => f.id === sel) ? sel : null;
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

  const selectedFurniture = furniture.find(f => f.id === selectedId);

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
            <div ref={canvasHostRef} className="canvas-host">
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
                  cursor: isRightPanning ? 'grabbing' : isCalibrating ? 'crosshair' : 'default',
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
                        isSelected={item.id === selectedId}
                        onSelect={() => setSelectedId(item.id)}
                        onDelete={() => deleteFurniture(item.id)}
                        onDragEnd={(e) => handleDragEnd(item.id, e)}
                        onTransformEnd={(e) => handleTransformEnd(item.id, e)}
                      />
                    ))}
                  </Group>
                </Layer>
              </Stage>
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
              selectedFurniture={selectedFurniture}
              onUpdateFurniture={updateFurniture}
              onUpdateFurnitureColor={updateFurnitureColor}
              onDeleteFurniture={deleteFurniture}
              isCalibrated={!!pixelsPerInch}
              canvasViewLocked={canvasViewLocked}
              onToggleCanvasViewLock={() => setCanvasViewLocked((v) => !v)}
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

      {!floorPlanUrl && !isDraggingFile && (
        <div className="no-floorplan">
          <div className="upload-prompt">
            <h2>Upload a Floor Plan to Get Started</h2>
            <p>Drag and drop an image here or click the button below</p>
            <p className="upload-hint">Right-click to Pan, Ctrl+Scroll to Zoom.</p>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="upload-btn">
              Choose Floor Plan Image
            </button>
          </div>
        </div>
      )}

      {showCalibrationModal && (
        <CalibrationModal
          onSubmit={handleCalibrationSubmit}
          onCancel={() => {
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
