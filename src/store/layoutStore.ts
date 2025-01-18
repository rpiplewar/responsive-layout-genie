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
  updateRelativePosition: (id: string, relativePosition: RelativePosition | undefined) => void;
  deleteContainer: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  setSelectedDevice: (device: string) => void;
  getExportData: () => Record<'PORTRAIT' | 'LANDSCAPE', Record<string, { x: number; y: number; width: number; height: number }>>;
}

const calculatePositionFromRelative = (
  container: Container,
  reference: Container | undefined,
  device: { width: number; height: number },
  orientation: 'portrait' | 'landscape'
): ContainerPosition => {
  if (!container.relativePosition) return container[orientation];

  const { referenceId, referenceEdge, targetEdge, gap, gapUnit } = container.relativePosition;
  const containerPos = container[orientation];
  
  // If reference is SCREEN, use device dimensions
  if (referenceId === 'SCREEN') {
    const gapValue = gapUnit === 'percent' ? 
      gap * (referenceEdge === 'left' || referenceEdge === 'right' ? device.width : device.height) :
      gap;

    switch (referenceEdge) {
      case 'top':
        return { ...containerPos, y: containerPos.height / 2 + gapValue };
      case 'bottom':
        return { ...containerPos, y: device.height - containerPos.height / 2 - gapValue };
      case 'left':
        return { ...containerPos, x: containerPos.width / 2 + gapValue };
      case 'right':
        return { ...containerPos, x: device.width - containerPos.width / 2 - gapValue };
      default:
        return containerPos;
    }
  }

  // If reference container doesn't exist, return original position
  if (!reference) return containerPos;

  const refPos = reference[orientation];
  const gapValue = gapUnit === 'percent' ? 
    gap * (referenceEdge === 'left' || referenceEdge === 'right' ? device.width : device.height) :
    gap;

  switch (referenceEdge) {
    case 'top':
      return { ...containerPos, y: refPos.y - refPos.height / 2 - containerPos.height / 2 - gapValue };
    case 'bottom':
      return { ...containerPos, y: refPos.y + refPos.height / 2 + containerPos.height / 2 + gapValue };
    case 'left':
      return { ...containerPos, x: refPos.x - refPos.width / 2 - containerPos.width / 2 - gapValue };
    case 'right':
      return { ...containerPos, x: refPos.x + refPos.width / 2 + containerPos.width / 2 + gapValue };
    default:
      return containerPos;
  }
};

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
  updateRelativePosition: (id, relativePosition) =>
    set((state) => ({
      containers: state.containers.map((container) =>
        container.id === id
          ? {
              ...container,
              relativePosition,
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
    const { containers, selectedDevice } = get();
    const device = devices[selectedDevice];

    // Sort containers based on dependencies
    const sortedContainers = [...containers].sort((a, b) => {
      if (a.relativePosition?.referenceId === b.id) return 1;
      if (b.relativePosition?.referenceId === a.id) return -1;
      return 0;
    });

    return {
      PORTRAIT: sortedContainers.reduce((acc, container) => {
        const position = calculatePositionFromRelative(
          container,
          containers.find(c => c.id === container.relativePosition?.referenceId),
          device,
          'portrait'
        );
        return {
          ...acc,
          [container.name]: {
            x: position.x / device.width,
            y: position.y / device.height,
            width: position.width / device.width,
            height: position.height / device.height,
          },
        };
      }, {}),
      LANDSCAPE: sortedContainers.reduce((acc, container) => {
        const position = calculatePositionFromRelative(
          container,
          containers.find(c => c.id === container.relativePosition?.referenceId),
          { width: device.height, height: device.width },
          'landscape'
        );
        return {
          ...acc,
          [container.name]: {
            x: position.x / device.height,
            y: position.y / device.width,
            width: position.width / device.height,
            height: position.height / device.width,
          },
        };
      }, {}),
    };
  },
}));