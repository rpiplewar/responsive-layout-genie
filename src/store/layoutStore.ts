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
  getExportData: () => any;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  containers: [],
  selectedId: null,
  selectedDevice: 'iPhone SE',

  addContainer: (parentId?: string) => {
    const parent = parentId ? get().containers.find(c => c.id === parentId) : null;
    const parentPos = parent ? (parent.portrait) : null;
    
    const newContainer: Container = {
      id: crypto.randomUUID(),
      name: `Container ${Date.now()}`,
      portrait: {
        x: parentPos ? parentPos.width / 2 : 50,
        y: parentPos ? parentPos.height / 2 : 50,
        width: parentPos ? parentPos.width * 0.5 : 100,
        height: parentPos ? parentPos.height * 0.5 : 100,
      },
      landscape: {
        x: parentPos ? parentPos.width / 2 : 50,
        y: parentPos ? parentPos.height / 2 : 50,
        width: parentPos ? parentPos.width * 0.5 : 100,
        height: parentPos ? parentPos.height * 0.5 : 100,
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

    const processContainer = (container: Container): any => {
      const result: any = {
        portrait: {
          x: container.portrait.x / device.width,
          y: container.portrait.y / device.height,
          width: container.portrait.width / device.width,
          height: container.portrait.height / device.height,
        },
        landscape: {
          x: container.landscape.x / device.height,
          y: container.landscape.y / device.width,
          width: container.landscape.width / device.height,
          height: container.landscape.height / device.width,
        }
      };

      const children = containers
        .filter(c => c.parentId === container.id)
        .reduce((acc, child) => ({
          ...acc,
          [child.name]: processContainer(child)
        }), {});

      if (Object.keys(children).length > 0) {
        result.children = children;
      }

      return result;
    };

    return {
      containers: containers
        .filter(c => !c.parentId)
        .reduce((acc, container) => ({
          ...acc,
          [container.name]: processContainer(container)
        }), {})
    };
  },
}));