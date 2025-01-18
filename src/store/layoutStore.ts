import { create } from 'zustand';

export interface Container {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LayoutState {
  containers: Container[];
  selectedId: string | null;
  addContainer: () => void;
  updateContainer: (id: string, updates: Partial<Container>) => void;
  deleteContainer: (id: string) => void;
  setSelectedId: (id: string | null) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  containers: [],
  selectedId: null,
  addContainer: () => {
    const newContainer: Container = {
      id: crypto.randomUUID(),
      name: `Container ${Date.now()}`,
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    };
    set((state) => ({
      containers: [...state.containers, newContainer],
      selectedId: newContainer.id,
    }));
  },
  updateContainer: (id, updates) =>
    set((state) => ({
      containers: state.containers.map((container) =>
        container.id === id ? { ...container, ...updates } : container
      ),
    })),
  deleteContainer: (id) =>
    set((state) => ({
      containers: state.containers.filter((container) => container.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),
  setSelectedId: (id) => set({ selectedId: id }),
}));