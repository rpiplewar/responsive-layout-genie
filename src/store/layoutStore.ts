import { create } from 'zustand';
import { devices } from '../config/devices';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ContainerPosition extends Position, Size {}

export interface AssetReference {
  reference: 'container' | string;
  x: number;
  y: number;
}

export interface AssetTransform {
  position: AssetReference;
  size: Size;
  origin: Position;
  scaleMode: 'fit' | 'fill' | 'stretch';
  maintainAspectRatio: boolean;
  rotation: number;
}

export interface Asset {
  id: string;
  name: string;
  type: 'image';
  key: string;
  portrait: AssetTransform;
  landscape: AssetTransform;
}

export interface Container {
  id: string;
  name: string;
  portrait: ContainerPosition;
  landscape: ContainerPosition;
  parentId?: string;
  assets: { [key: string]: Asset };
}

interface LayoutState {
  containers: Container[];
  selectedId: string | null;
  selectedAssetId: string | null;
  selectedDevice: string;
  uploadedImages: { [key: string]: string }; // Add this new property
  addContainer: (parentId?: string) => void;
  addAsset: (containerId: string) => void;
  updateContainer: (id: string, updates: Partial<ContainerPosition>, orientation: 'portrait' | 'landscape') => void;
  updateAsset: (containerId: string, assetId: string, updates: Partial<AssetTransform>, orientation: 'portrait' | 'landscape') => void;
  deleteContainer: (id: string) => void;
  deleteAsset: (containerId: string, assetId: string) => void;
  setSelectedId: (id: string | null) => void;
  setSelectedAssetId: (id: string | null) => void;
  setSelectedDevice: (device: string) => void;
  updateContainerName: (id: string, name: string) => void;
  updateAssetName: (containerId: string, assetId: string, name: string) => void;
  getContainerPath: (id: string) => Container[];
  getExportData: () => any;
  uploadImage: (assetId: string, file: File) => void; // Add this new method
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  containers: [],
  selectedId: null,
  selectedAssetId: null,
  selectedDevice: 'iPhone SE',
  uploadedImages: {},

  addContainer: (parentId?: string) => {
    const parent = parentId ? get().containers.find(c => c.id === parentId) : null;
    const parentPos = parent ? parent.portrait : null;
    
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
      assets: {},
    };

    set((state) => ({
      containers: [...state.containers, newContainer],
      selectedId: newContainer.id,
    }));
  },

  addAsset: (containerId: string) => {
    const container = get().containers.find(c => c.id === containerId);
    if (!container) return;

    const newAsset: Asset = {
      id: crypto.randomUUID(),
      name: `Asset ${Date.now()}`,
      type: 'image',
      key: '',
      portrait: {
        position: {
          reference: 'container',
          x: 0.5,
          y: 0.5,
        },
        size: { width: 0.5, height: 0.5 },
        origin: { x: 0.5, y: 0.5 },
        scaleMode: 'fit',
        maintainAspectRatio: true,
        rotation: 0,
      },
      landscape: {
        position: {
          reference: 'container',
          x: 0.5,
          y: 0.5,
        },
        size: { width: 0.5, height: 0.5 },
        origin: { x: 0.5, y: 0.5 },
        scaleMode: 'fit',
        maintainAspectRatio: true,
        rotation: 0,
      },
    };

    set((state) => ({
      containers: state.containers.map(c => 
        c.id === containerId 
          ? { ...c, assets: { ...c.assets, [newAsset.id]: newAsset } }
          : c
      ),
      selectedAssetId: newAsset.id,
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

  updateAsset: (containerId: string, assetId: string, updates: Partial<AssetTransform>, orientation: 'portrait' | 'landscape') => {
    set((state) => ({
      containers: state.containers.map(c => 
        c.id === containerId 
          ? {
              ...c,
              assets: {
                ...c.assets,
                [assetId]: {
                  ...c.assets[assetId],
                  [orientation]: {
                    ...c.assets[assetId][orientation],
                    ...updates,
                  },
                },
              },
            }
          : c
      ),
    }));
  },

  deleteAsset: (containerId: string, assetId: string) => {
    set((state) => ({
      containers: state.containers.map(c => 
        c.id === containerId 
          ? {
              ...c,
              assets: Object.fromEntries(
                Object.entries(c.assets).filter(([id]) => id !== assetId)
              ),
            }
          : c
      ),
      selectedAssetId: state.selectedAssetId === assetId ? null : state.selectedAssetId,
    }));
  },

  setSelectedAssetId: (id) => set({ selectedAssetId: id }),

  updateAssetName: (containerId: string, assetId: string, name: string) => {
    set((state) => ({
      containers: state.containers.map(c => 
        c.id === containerId 
          ? {
              ...c,
              assets: {
                ...c.assets,
                [assetId]: {
                  ...c.assets[assetId],
                  name,
                },
              },
            }
          : c
      ),
    }));
  },

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
    const { containers } = get();
    const device = devices[get().selectedDevice];

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
        },
      };

      if (Object.keys(container.assets).length > 0) {
        result.assets = container.assets;
      }

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

  uploadImage: (assetId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      set((state) => ({
        uploadedImages: {
          ...state.uploadedImages,
          [assetId]: e.target?.result as string
        }
      }));
    };
    reader.readAsDataURL(file);
  },
}));
