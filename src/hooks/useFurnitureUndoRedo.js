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
    case 'LOAD_SNAPSHOT':
      return {
        furniture: cloneItems(action.furniture),
        past: [],
        redo: [],
      };
    default:
      return state;
  }
}

/**
 * Snapshot-based undo/redo for the furniture array.
 * Use commitFurniture for add / move / rotate / resize / delete.
 * Use resetAll after clearing the canvas so stacks do not restore removed items.
 */
export function useFurnitureUndoRedo() {
  const [state, dispatch] = useReducer(furnitureReducer, initialState);

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
