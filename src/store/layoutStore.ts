import { create } from 'zustand';
import { devices } from '../config/devices';

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
  parentId?: string;
  children?: { [key: string]: Container };
}

interface LayoutState {
  containers: Container[];
  selectedId: string | null;
  selectedDevice: string;
  addContainer: (parentId?: string) => void;
  updateContainer: (id: string, updates: Partial<ContainerPosition>, orientation: 'portrait' | 'landscape') => void;
  deleteContainer: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  setSelectedDevice: (device: string) => void;
  updateContainerName: (id: string, name: string) => void;
  getContainerPath: (id: string) => Container[];
  getExportData: () => Record<'PORTRAIT' | 'LANDSCAPE', Record<string, { x: number; y: number; width: number; height: number }>>;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  containers: [],
  selectedId: null,
  selectedDevice: 'iPhone SE',

  addContainer: (parentId?: string) => {
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
      parentId,
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
      containers: state.containers.filter((container) => container.id !== id && container.parentId !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  setSelectedId: (id) => set({ selectedId: id }),
  
  setSelectedDevice: (device) => set({ selectedDevice: device }),

  updateContainerName: (id, name) =>
    set((state) => ({
      containers: state.containers.map((container) =>
        container.id === id ? { ...container, name } : container
      ),
    })),

  getContainerPath: (id) => {
    const containers = get().containers;
    const path: Container[] = [];
    let current = containers.find(c => c.id === id);
    
    while (current) {
      path.unshift(current);
      current = containers.find(c => c.id === current?.parentId);
    }
    
    return path;
  },

  getExportData: () => {
    const { containers, selectedDevice } = get();
    const device = devices[selectedDevice];

    const processContainer = (container: Container, orientation: 'portrait' | 'landscape') => {
      const position = container[orientation];
      const dimensionX = orientation === 'portrait' ? device.width : device.height;
      const dimensionY = orientation === 'portrait' ? device.height : device.width;

      return {
        x: position.x / dimensionX,
        y: position.y / dimensionY,
        width: position.width / dimensionX,
        height: position.height / dimensionY,
      };
    };

    return {
      PORTRAIT: containers.reduce((acc, container) => ({
        ...acc,
        [container.name]: processContainer(container, 'portrait'),
      }), {}),
      LANDSCAPE: containers.reduce((acc, container) => ({
        ...acc,
        [container.name]: processContainer(container, 'landscape'),
      }), {}),
    };
  },
}));