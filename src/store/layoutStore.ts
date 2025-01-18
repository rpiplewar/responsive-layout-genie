import { create } from 'zustand';

export interface ContainerPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Container {
  id: string;
  name: string;
  portrait: ContainerPosition;
  landscape: ContainerPosition;
}

interface LayoutState {
  containers: Container[];
  selectedId: string | null;
  selectedDevice: string;
  addContainer: () => void;
  updateContainer: (id: string, updates: Partial<ContainerPosition>, orientation: 'portrait' | 'landscape') => void;
  deleteContainer: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  setSelectedDevice: (device: string) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  containers: [],
  selectedId: null,
  selectedDevice: 'iPhone SE',
  addContainer: () => {
    const newContainer: Container = {
      id: crypto.randomUUID(),
      name: `Container ${Date.now()}`,
      portrait: {
        x: 50,
        y: 50,
        width: 100,
        height: 100,
      },
      landscape: {
        x: 50,
        y: 50,
        width: 100,
        height: 100,
      },
    };
    set((state) => ({
      containers: [...state.containers, newContainer],
      selectedId: newContainer.id,
    }));
  },
  updateContainer: (id, updates, orientation) =>
    set((state) => ({
      containers: state.containers.map((container) =>
        container.id === id
          ? {
              ...container,
              [orientation]: { ...container[orientation], ...updates },
            }
          : container
      ),
    })),
  deleteContainer: (id) =>
    set((state) => ({
      containers: state.containers.filter((container) => container.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),
  setSelectedId: (id) => set({ selectedId: id }),
  setSelectedDevice: (device) => set({ selectedDevice: device }),
}));