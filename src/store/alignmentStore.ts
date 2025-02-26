import { create } from 'zustand';
import { Position, Size } from './types';

export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

export interface AlignmentGuide {
  type: AlignmentType;
  position: number;
  referenceId: string;
}

export interface AlignmentControls {
  horizontal: AlignmentType;
  vertical: AlignmentType;
}

interface AlignmentOperation {
  type: 'align' | 'distribute';
  elementIds: string[];
  referenceId: string;
  alignment: AlignmentControls;
  previousPositions: Record<string, Position>;
}

interface AlignmentState {
  guides: AlignmentGuide[];
  activeAlignments: Set<AlignmentType>;
  snapThreshold: number;
  history: AlignmentOperation[];
  historyIndex: number;
  
  // Actions
  setGuides: (guides: AlignmentGuide[]) => void;
  clearGuides: () => void;
  pushOperation: (operation: AlignmentOperation) => void;
  undo: () => void;
  redo: () => void;
}

export const useAlignmentStore = create<AlignmentState>((set, get) => ({
  guides: [],
  activeAlignments: new Set(),
  snapThreshold: 5,
  history: [],
  historyIndex: -1,

  setGuides: (guides) => set({ guides }),
  clearGuides: () => set({ guides: [] }),
  
  pushOperation: (operation) => {
    const { history, historyIndex } = get();
    const newHistory = [...history.slice(0, historyIndex + 1), operation];
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  },
  
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= 0) {
      // Implement undo logic here
      set({ historyIndex: historyIndex - 1 });
    }
  },
  
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      // Implement redo logic here
      set({ historyIndex: historyIndex + 1 });
    }
  }
})); 