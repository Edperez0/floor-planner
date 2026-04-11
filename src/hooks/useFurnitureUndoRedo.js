import { useReducer, useCallback } from 'react';

const MAX_HISTORY = 50;

function cloneItems(items) {
  try {
    return structuredClone(items);
  } catch {
    return JSON.parse(JSON.stringify(items));
  }
}

function equal(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const initialState = {
  furniture: [],
  past: [],
  redo: [],
};

function initFurnitureState(initialFurniture) {
  return {
    furniture: cloneItems(Array.isArray(initialFurniture) ? initialFurniture : []),
    past: [],
    redo: [],
  };
}

function furnitureReducer(state, action) {
  const { furniture, past, redo } = state;

  switch (action.type) {
    case 'COMMIT': {
      const next = action.updater(furniture);
      if (equal(furniture, next)) return state;
      return {
        furniture: next,
        past: [...past, cloneItems(furniture)].slice(-MAX_HISTORY),
        redo: [],
      };
    }
    case 'UNDO': {
      if (past.length === 0) return state;
      const previous = past[past.length - 1];
      return {
        furniture: previous,
        past: past.slice(0, -1),
        redo: [cloneItems(furniture), ...redo].slice(0, MAX_HISTORY),
      };
    }
    case 'REDO': {
      if (redo.length === 0) return state;
      const next = redo[0];
      return {
        furniture: next,
        past: [...past, cloneItems(furniture)].slice(-MAX_HISTORY),
        redo: redo.slice(1),
      };
    }
    case 'RESET_ALL':
      return initialState;
    case 'LOAD_SNAPSHOT': {
      // #region agent log
      const _len = Array.isArray(action.furniture) ? action.furniture.length : -1;
      fetch('http://127.0.0.1:7687/ingest/2e6ba286-1170-4a08-829f-40c18e955fd4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '548a6c' },
        body: JSON.stringify({
          sessionId: '548a6c',
          runId: 'pre-fix',
          hypothesisId: 'H2',
          location: 'useFurnitureUndoRedo.js:LOAD_SNAPSHOT',
          message: 'Reducer LOAD_SNAPSHOT',
          data: { incomingLen: _len },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return {
        furniture: cloneItems(action.furniture),
        past: [],
        redo: [],
      };
    }
    default:
      return state;
  }
}

/**
 * Snapshot-based undo/redo for the furniture array.
 * Use commitFurniture for add / move / rotate / resize / delete.
 * Use resetAll after clearing the canvas so stacks do not restore removed items.
 */
export function useFurnitureUndoRedo(initialFurniture = []) {
  const [state, dispatch] = useReducer(furnitureReducer, initialFurniture, initFurnitureState);

  const commitFurniture = useCallback((updater) => {
    dispatch({ type: 'COMMIT', updater });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const resetAll = useCallback(() => {
    dispatch({ type: 'RESET_ALL' });
  }, []);

  const loadSnapshot = useCallback((nextFurniture) => {
    dispatch({ type: 'LOAD_SNAPSHOT', furniture: nextFurniture });
  }, []);

  return {
    furniture: state.furniture,
    commitFurniture,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.redo.length > 0,
    resetAll,
    loadSnapshot,
  };
}
