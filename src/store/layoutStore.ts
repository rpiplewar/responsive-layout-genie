import { create } from 'zustand';
import { devices } from '../config/devices';

export interface ContainerPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RelativePosition {
  referenceId: string | 'SCREEN';
  referenceEdge: 'top' | 'bottom' | 'left' | 'right';
  targetEdge: 'top' | 'bottom' | 'left' | 'right';
  gap: number;
  gapUnit: 'pixel' | 'percent';
}

export interface Container {
  id: string;
  name: string;
  portrait: ContainerPosition;
  landscape: ContainerPosition;
  relativePosition?: RelativePosition;
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
  getExportData: () => Record<'PORTRAIT' | 'LANDSCAPE', Record<string, { x: number; y: number; width: number; height: number }>>;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
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
  getExportData: () => {
    const { containers } = get();
    const { selectedDevice } = get();
    const device = devices[selectedDevice];

    return {
      PORTRAIT: containers.reduce((acc, container) => ({
        ...acc,
        [container.name]: {
          x: container.portrait.x / device.width,
          y: container.portrait.y / device.height,
          width: container.portrait.width / device.width,
          height: container.portrait.height / device.height,
        },
      }), {}),
      LANDSCAPE: containers.reduce((acc, container) => ({
        ...acc,
        [container.name]: {
          x: container.landscape.x / device.height,
          y: container.landscape.y / device.width,
          width: container.landscape.width / device.height,
          height: container.landscape.height / device.width,
        },
      }), {}),
    };
  },
}));