import { create } from 'zustand';
import { devices } from '../config/devices';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ContainerPosition extends Position, Size {}

export interface DepthInfo {
  id: string;
  depth: number; // 0-1000 for easier understanding
  absoluteDepthCache?: number; // Optional cache for performance
}

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
  isVisible?: boolean;
}

export interface Asset extends DepthInfo {
  id: string;
  name: string;
  type: 'image';
  key: string;
  portrait: AssetTransform;
  landscape: AssetTransform;
  isLocked?: boolean;
}

export interface Container extends DepthInfo {
  id: string;
  name: string;
  portrait: ContainerPosition;
  landscape: ContainerPosition;
  parentId?: string;
  assets: { [key: string]: Asset };
  isLocked?: boolean;
  level: number; // Keep level for visual hierarchy
}

export interface AssetMetadata {
  id: string;
  name: string;
  type: 'image';
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  dateUploaded: number;
}

interface ExportedAsset {
  name: string;
  type: 'image';
  key: string;
  portrait: AssetTransform & { isVisible: boolean };
  landscape: AssetTransform & { isVisible: boolean };
  depth: number;
}

interface ExportedContainer {
  portrait: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landscape: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  depth: number;
  assets?: { [key: string]: ExportedAsset };
  children?: { [key: string]: ExportedContainer };
}

interface ExportData {
  containers: { [key: string]: ExportedContainer };
}

export interface LayoutState {
  containers: Container[];
  selectedId: string | null;
  selectedAssetId: string | null;
  selectedDevice: string;
  activeOrientation: 'portrait' | 'landscape' | null;
  uploadedImages: { [key: string]: string };
  assetMetadata: { [key: string]: AssetMetadata };
  history: {
    past: Container[][];
    future: Container[][];
  };
  saveToHistory: (newContainers: Container[]) => void;
  addContainer: (parentId?: string) => void;
  addAsset: (containerId: string) => void;
  duplicateAsset: (containerId: string, assetId: string) => void;
  updateContainer: (id: string, updates: Partial<ContainerPosition>, orientation: 'portrait' | 'landscape') => void;
  updateAsset: (containerId: string, assetId: string, updates: Partial<AssetTransform>, orientation: 'portrait' | 'landscape') => void;
  deleteContainer: (id: string) => void;
  deleteAsset: (containerId: string, assetId: string) => void;
  setSelectedId: (id: string | null) => void;
  setSelectedAssetId: (id: string | null) => void;
  setSelectedDevice: (device: string) => void;
  setActiveOrientation: (orientation: 'portrait' | 'landscape' | null) => void;
  updateContainerName: (id: string, name: string) => void;
  updateAssetName: (containerId: string, assetId: string, name: string) => void;
  getContainerPath: (id: string) => Container[];
  getExportData: () => ExportData;
  uploadImage: (assetId: string, file: File) => void;
  deleteAssetFromLibrary: (assetId: string) => void;
  updateAssetMetadata: (assetId: string, updates: Partial<AssetMetadata>) => void;
  updateAssetKey: (containerId: string, assetId: string, key: string) => void;
  importConfig: (config: { containers: { [key: string]: NestedContainer }; assets: { [key: string]: AssetMetadata } }) => void;
  exportLayout: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  reorderContainer: (containerId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
  updateContainerParent: (containerId: string, newParentId: string | null) => void;
  toggleContainerLock: (id: string) => void;
  toggleAssetLock: (containerId: string, assetId: string) => void;
  getNextAvailableDepth: (parentId?: string) => number;
  updateDepth: (id: string, newDepth: number) => void;
  getAbsoluteDepth: (containerId: string, assetId?: string) => number;
  reorderDepth: (items: DepthInfo[], targetIndex: number) => void;
  moveAsset: (assetId: string, sourceContainerId: string, targetContainerId: string) => void;
  copyOrientationToLandscape: (containerId: string) => void;
  copyOrientationToPortrait: (containerId: string) => void;
}

interface NestedContainer {
  portrait: ContainerPosition;
  landscape: ContainerPosition;
  assets?: { [key: string]: ExportedAsset };
  children?: { [key: string]: NestedContainer };
  depth: number;
}

// Constants for depth management
const MAX_POSITION = 10000;
const DEFAULT_GAP = 2;

export const useLayoutStore = create<LayoutState>((set, get) => ({
  containers: [],
  selectedId: null,
  selectedAssetId: null,
  selectedDevice: 'iPhone SE',
  activeOrientation: null,
  uploadedImages: {},
  assetMetadata: {},
  history: {
    past: [],
    future: []
  },

  // Helper function to save state to history
  saveToHistory: (newContainers: Container[]) => {
    const { containers, history } = get();
    set({
      containers: newContainers,
      history: {
        past: [...history.past, containers],
        future: []
      }
    });
  },

  // Undo/Redo functionality
  undo: () => {
    const { history, containers } = get();
    if (history.past.length === 0) return;

    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);

    set({
      containers: previous,
      history: {
        past: newPast,
        future: [containers, ...history.future]
      }
    });
  },

  redo: () => {
    const { history, containers } = get();
    if (history.future.length === 0) return;

    const next = history.future[0];
    const newFuture = history.future.slice(1);

    set({
      containers: next,
      history: {
        past: [...history.past, containers],
        future: newFuture
      }
    });
  },

  canUndo: () => {
    return get().history.past.length > 0;
  },

  canRedo: () => {
    return get().history.future.length > 0;
  },

  addContainer: (parentId?: string) => {
    const parent = parentId ? get().containers.find(c => c.id === parentId) : null;
    const device = devices[get().selectedDevice];
    const newId = crypto.randomUUID();
    
    const newContainer: Container = {
      id: newId,
      name: `Container ${Date.now()}`,
      portrait: {
        x: parent?.portrait 
          ? parent.portrait.x  // Position at parent's origin
          : device.width * 0.1,  // 10% of device width if no parent
        y: parent?.portrait 
          ? parent.portrait.y  // Position at parent's origin
          : device.height * 0.1,  // 10% of device height if no parent
        width: parent?.portrait 
          ? parent.portrait.width * 0.5  // 50% of parent width
          : device.width * 0.2,  // 20% of device width if no parent
        height: parent?.portrait 
          ? parent.portrait.height * 0.5  // 50% of parent height
          : device.height * 0.2,  // 20% of device height if no parent
      },
      landscape: {
        x: parent?.landscape 
          ? parent.landscape.x  // Position at parent's origin
          : device.height * 0.1,
        y: parent?.landscape 
          ? parent.landscape.y  // Position at parent's origin
          : device.width * 0.1,
        width: parent?.landscape 
          ? parent.landscape.width * 0.5
          : device.height * 0.2,
        height: parent?.landscape 
          ? parent.landscape.height * 0.5
          : device.width * 0.2,
      },
      parentId,
      assets: {},
      level: parent ? parent.level + 1 : 0,
      depth: get().getNextAvailableDepth(parentId)
    };
    
    try {
      const newContainers = [...get().containers, newContainer];
      set((state) => ({
        ...state,
        containers: newContainers,
        selectedId: newContainer.id,
        selectedAssetId: null
      }));
      get().saveToHistory(newContainers);
    } catch (error) {
      console.error('Error creating container:', error);
    }
  },

  addAsset: (containerId: string) => {
    const container = get().containers.find(c => c.id === containerId);
    if (!container) return;

    const newId = crypto.randomUUID();
    const newAsset: Asset = {
      id: newId,
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
        isVisible: true,
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
        isVisible: true,
      },
      depth: get().getNextAvailableDepth(containerId)
    };

    const newContainers = get().containers.map(c => 
      c.id === containerId 
        ? { ...c, assets: { ...c.assets, [newAsset.id]: newAsset } }
        : c
    );

    set((state) => ({
      ...state,
      containers: newContainers,
      selectedAssetId: newAsset.id
    }));

    get().saveToHistory(newContainers);
    
    import('./layerStore').then(({ useLayerStore }) => {
      useLayerStore.getState().syncWithLayoutStore();
      useLayerStore.getState().selectLayer(newAsset.id);
    });
  },

  duplicateAsset: (containerId: string, assetId: string) => {
    const container = get().containers.find(c => c.id === containerId);
    if (!container) return;

    const sourceAsset = container.assets[assetId];
    if (!sourceAsset) return;

    const newAsset: Asset = {
      ...sourceAsset,
      id: crypto.randomUUID(),
      name: `${sourceAsset.name} Copy`,
      key: sourceAsset.key,
      portrait: JSON.parse(JSON.stringify(sourceAsset.portrait)),
      landscape: JSON.parse(JSON.stringify(sourceAsset.landscape)),
      depth: get().getNextAvailableDepth(containerId)
    };

    const newContainers = get().containers.map(c => 
      c.id === containerId 
        ? { ...c, assets: { ...c.assets, [newAsset.id]: newAsset } }
        : c
    );
    get().saveToHistory(newContainers);
    
    set({ selectedAssetId: newAsset.id });
    
    import('./layerStore').then(({ useLayerStore }) => {
      useLayerStore.getState().syncWithLayoutStore();
      useLayerStore.getState().selectLayer(newAsset.id);
    });
  },

  updateContainer: (id, updates, orientation) => {
    const newContainers = get().containers.map((container) =>
      container.id === id
        ? {
            ...container,
            [orientation]: { ...container[orientation], ...updates },
          }
        : container
    );
    get().saveToHistory(newContainers);
  },

  deleteContainer: (id) => {
    const newContainers = get().containers.filter((container) => container.id !== id && container.parentId !== id);
    get().saveToHistory(newContainers);
    set({ selectedId: get().selectedId === id ? null : get().selectedId });
  },

  setSelectedId: (id) => {
    set((state) => ({
      selectedId: id,
      selectedAssetId: null,
      activeOrientation: id ? state.activeOrientation : null
    }));
  },
  
  setSelectedDevice: (device) => set({ selectedDevice: device }),

  updateContainerName: (id, name) => {
    const newContainers = get().containers.map((container) =>
      container.id === id ? { ...container, name } : container
    );
    get().saveToHistory(newContainers);
  },

  updateAsset: (containerId: string, assetId: string, updates: Partial<AssetTransform>, orientation: 'portrait' | 'landscape') => {
    const newContainers = get().containers.map(c => 
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
    );
    get().saveToHistory(newContainers);
  },

  deleteAsset: (containerId: string, assetId: string) => {
    const newContainers = get().containers.map(c => 
      c.id === containerId 
        ? {
            ...c,
            assets: Object.fromEntries(
              Object.entries(c.assets).filter(([id]) => id !== assetId)
            ),
          }
        : c
    );
    get().saveToHistory(newContainers);
    set({ selectedAssetId: get().selectedAssetId === assetId ? null : get().selectedAssetId });
  },

  setSelectedAssetId: (id) => {
    set((state) => ({
      selectedAssetId: id,
      activeOrientation: id ? state.activeOrientation : null
    }));
  },

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

    const processContainer = (container: Container, parentDimensions?: { portrait: ContainerPosition, landscape: ContainerPosition }): ExportedContainer => {
      const result: ExportedContainer = {
        portrait: {
          x: parentDimensions 
            ? (container.portrait.x - parentDimensions.portrait.x) / parentDimensions.portrait.width 
            : container.portrait.x / device.width,
          y: parentDimensions 
            ? (container.portrait.y - parentDimensions.portrait.y) / parentDimensions.portrait.height
            : container.portrait.y / device.height,
          width: parentDimensions 
            ? container.portrait.width / parentDimensions.portrait.width
            : container.portrait.width / device.width,
          height: parentDimensions 
            ? container.portrait.height / parentDimensions.portrait.height
            : container.portrait.height / device.height,
        },
        landscape: {
          x: parentDimensions 
            ? (container.landscape.x - parentDimensions.landscape.x) / parentDimensions.landscape.width
            : container.landscape.x / device.height,
          y: parentDimensions 
            ? (container.landscape.y - parentDimensions.landscape.y) / parentDimensions.landscape.height
            : container.landscape.y / device.width,
          width: parentDimensions 
            ? container.landscape.width / parentDimensions.landscape.width
            : container.landscape.width / device.height,
          height: parentDimensions 
            ? container.landscape.height / parentDimensions.landscape.height
            : container.landscape.height / device.width,
        },
        depth: container.depth
      };

      if (Object.keys(container.assets).length > 0) {
        result.assets = Object.entries(container.assets).reduce((acc, [id, asset]) => ({
          ...acc,
          [id]: {
            ...asset,
            name: asset.name,
            key: asset.key,
            depth: asset.depth,
            portrait: {
              ...asset.portrait,
              isVisible: asset.portrait.isVisible ?? true
            },
            landscape: {
              ...asset.landscape,
              isVisible: asset.landscape.isVisible ?? true
            }
          }
        }), {});
      }

      const children = containers
        .filter(c => c.parentId === container.id)
        .reduce((acc, child) => ({
          ...acc,
          [child.name]: processContainer(child, {
            portrait: container.portrait,
            landscape: container.landscape
          })
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
      const dataUrl = e.target?.result as string;
      
      // Create image element to get dimensions
      const img = new Image();
      img.onload = () => {
        set((state) => ({
          uploadedImages: {
            ...state.uploadedImages,
            [assetId]: dataUrl
          },
          assetMetadata: {
            ...state.assetMetadata,
            [assetId]: {
              id: assetId,
              name: file.name,
              type: 'image',
              size: file.size,
              dimensions: {
                width: img.width,
                height: img.height
              },
              dateUploaded: Date.now()
            }
          }
        }));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  },

  deleteAssetFromLibrary: (assetId: string) => {
    set((state) => {
      const { [assetId]: _, ...remainingImages } = state.uploadedImages;
      const { [assetId]: __, ...remainingMetadata } = state.assetMetadata;
      
      return {
        uploadedImages: remainingImages,
        assetMetadata: remainingMetadata,
        containers: state.containers // Keep the containers unchanged
      };
    });
  },

  updateAssetMetadata: (assetId: string, updates: Partial<AssetMetadata>) => {
    set((state) => ({
      assetMetadata: {
        ...state.assetMetadata,
        [assetId]: {
          ...state.assetMetadata[assetId],
          ...updates
        }
      }
    }));
  },

  updateAssetKey: (containerId: string, assetId: string, key: string) => {
    set((state) => ({
      containers: state.containers.map(c => 
        c.id === containerId 
          ? {
              ...c,
              assets: {
                ...c.assets,
                [assetId]: {
                  ...c.assets[assetId],
                  key
                },
              },
            }
          : c
      ),
    }));
  },

  importConfig: (config) => {
    const flattenContainers = (
      containers: { [key: string]: NestedContainer },
      parentId?: string,
      level: number = 0,
      parentDimensions?: { portrait: ContainerPosition, landscape: ContainerPosition }
    ): Container[] => {
      const selectedDevice = devices[get().selectedDevice];
      
      return Object.entries(containers).flatMap(([name, container]) => {
        const id = crypto.randomUUID();

        const flatContainer: Container = {
          id,
          name,
          portrait: {
            x: parentDimensions 
              ? parentDimensions.portrait.x + (container.portrait.x * parentDimensions.portrait.width)
              : container.portrait.x * selectedDevice.width,
            y: parentDimensions 
              ? parentDimensions.portrait.y + (container.portrait.y * parentDimensions.portrait.height)
              : container.portrait.y * selectedDevice.height,
            width: parentDimensions 
              ? container.portrait.width * parentDimensions.portrait.width
              : container.portrait.width * selectedDevice.width,
            height: parentDimensions 
              ? container.portrait.height * parentDimensions.portrait.height
              : container.portrait.height * selectedDevice.height,
          },
          landscape: {
            x: parentDimensions 
              ? parentDimensions.landscape.x + (container.landscape.x * parentDimensions.landscape.width)
              : container.landscape.x * selectedDevice.height,
            y: parentDimensions 
              ? parentDimensions.landscape.y + (container.landscape.y * parentDimensions.landscape.height)
              : container.landscape.y * selectedDevice.width,
            width: parentDimensions 
              ? container.landscape.width * parentDimensions.landscape.width
              : container.landscape.width * selectedDevice.height,
            height: parentDimensions 
              ? container.landscape.height * parentDimensions.landscape.height
              : container.landscape.height * selectedDevice.width,
          },
          parentId,
          assets: container.assets ? Object.entries(container.assets).reduce((acc, [id, asset]) => ({
            ...acc,
            [id]: {
              ...asset,
              id,
              key: asset.key || asset.name,
              name: asset.name,
              depth: asset.depth || 0,
              portrait: {
                ...asset.portrait,
                isVisible: asset.portrait.isVisible ?? true
              },
              landscape: {
                ...asset.landscape,
                isVisible: asset.landscape.isVisible ?? true
              }
            }
          }), {}) : {},
          level,
          depth: container.depth || 0
        };

        const children = container.children
          ? flattenContainers(container.children, id, level + 1, {
              portrait: flatContainer.portrait,
              landscape: flatContainer.landscape
            })
          : [];

        return [flatContainer, ...children];
      });
    };

    const flattened = flattenContainers(config.containers);

    set((state) => ({
      containers: flattened,
      assetMetadata: {
        ...state.assetMetadata,
        ...Object.values(config.containers).reduce((acc, container) => {
          if (container.assets) {
            Object.values(container.assets).forEach(asset => {
              if (asset.name) {
                acc[asset.name] = {
                  id: asset.name,
                  name: asset.name,
                  type: 'image',
                  size: 0,
                  dateUploaded: Date.now(),
                };
              }
            });
          }
          return acc;
        }, {} as { [key: string]: AssetMetadata }),
      },
      selectedId: null,
      selectedAssetId: null,
    }));

    set((state) => ({
      uploadedImages: {
        ...state.uploadedImages,
        ...Object.values(config.containers).reduce((acc, container) => {
          if (container.assets) {
            Object.values(container.assets).forEach(asset => {
              if (asset.name && !state.uploadedImages[asset.name]) {
                acc[asset.name] = '';
              }
            });
          }
          return acc;
        }, {} as { [key: string]: string })
      }
    }));

    import('./layerStore').then(({ useLayerStore }) => {
      useLayerStore.getState().syncWithLayoutStore();
    });
  },
  
  exportLayout: async () => {
    const { getExportData, uploadedImages } = get();
    const config = getExportData();
    const zip = new JSZip();

    try {
      zip.file('layout.json', JSON.stringify(config, null, 2));

      const assetsFolder = zip.folder('assets');
      if (!assetsFolder) throw new Error('Failed to create assets folder');

      const imagePromises = Object.entries(uploadedImages).map(async ([assetId, dataUrl]) => {
        if (!dataUrl) return;
        
        try {
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          assetsFolder.file(`${assetId}.png`, blob);
        } catch (error) {
          console.error(`Failed to add image ${assetId}:`, error);
        }
      });

      await Promise.all(imagePromises);

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'layout-export.zip');
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  },

  setActiveOrientation: (orientation) => set({ activeOrientation: orientation }),

  reorderContainer: (containerId: string, targetId: string, position: 'before' | 'after' | 'inside') => {
    const state = get();
    const containers = [...state.containers];
    const containerIndex = containers.findIndex(c => c.id === containerId);
    const targetIndex = containers.findIndex(c => c.id === targetId);

    if (containerIndex === -1 || targetIndex === -1) return;

    const [container] = containers.splice(containerIndex, 1);

    if (position === 'inside') {
      container.parentId = targetId;
      const targetContainer = containers[targetIndex];
      container.level = targetContainer.level + 1;
      container.depth = state.getNextAvailableDepth(targetId);
      console.log('Container moved inside:', {
        containerId,
        targetId,
        newLevel: container.level,
        newDepth: container.depth
      });
    } else {
      container.parentId = containers[targetIndex].parentId;
      container.level = containers[targetIndex].level;
      container.depth = state.getNextAvailableDepth(containers[targetIndex].parentId);
      console.log('Container reordered:', {
        containerId,
        targetId,
        position,
        newLevel: container.level,
        newDepth: container.depth
      });
    }

    const newIndex = position === 'after' ? targetIndex + 1 : targetIndex;
    containers.splice(newIndex, 0, container);

    state.saveToHistory(containers);
    set({ containers });
  },

  updateContainerParent: (containerId: string, newParentId: string | null) => {
    const state = get();
    const containers = [...state.containers];
    const containerIndex = containers.findIndex(c => c.id === containerId);

    if (containerIndex === -1) {
      console.error('Container not found:', containerId);
      return;
    }

    const container = containers[containerIndex];
    const oldParentId = container.parentId;
    
    const oldParent = oldParentId ? containers.find(c => c.id === oldParentId) : null;
    const newParent = newParentId ? containers.find(c => c.id === newParentId) : null;

    const hasCircularRef = (containerId: string, parentId: string | undefined): boolean => {
      if (!parentId) return false;
      if (parentId === containerId) return true;
      const parent = containers.find(c => c.id === parentId);
      return parent ? hasCircularRef(containerId, parent.parentId) : false;
    };

    if (hasCircularRef(containerId, newParentId || undefined)) {
      console.error('Circular reference detected');
      return;
    }

    const newDepth = state.getNextAvailableDepth(newParentId);
    console.log('Container parent update:', {
      containerId,
      oldParentId,
      newParentId,
      oldDepth: container.depth,
      newDepth
    });

    const absolutePortrait = oldParent ? {
      x: container.portrait.x + (oldParent.portrait.x - oldParent.portrait.width / 2),
      y: container.portrait.y + (oldParent.portrait.y - oldParent.portrait.height / 2),
      width: container.portrait.width,
      height: container.portrait.height
    } : container.portrait;

    const absoluteLandscape = oldParent ? {
      x: container.landscape.x + (oldParent.landscape.x - oldParent.landscape.width / 2),
      y: container.landscape.y + (oldParent.landscape.y - oldParent.landscape.height / 2),
      width: container.landscape.width,
      height: container.landscape.height
    } : container.landscape;

    const newPortrait = newParent ? {
      x: absolutePortrait.x - (newParent.portrait.x - newParent.portrait.width / 2),
      y: absolutePortrait.y - (newParent.portrait.y - newParent.portrait.height / 2),
      width: absolutePortrait.width,
      height: absolutePortrait.height
    } : absolutePortrait;

    const newLandscape = newParent ? {
      x: absoluteLandscape.x - (newParent.landscape.x - newParent.landscape.width / 2),
      y: absoluteLandscape.y - (newParent.landscape.y - newParent.landscape.height / 2),
      width: absoluteLandscape.width,
      height: absoluteLandscape.height
    } : absoluteLandscape;

    const newLevel = newParent ? (newParent.level + 1) : 0;

    const updatedContainer = {
      ...container,
      parentId: newParentId,
      level: newLevel,
      depth: newDepth,
      portrait: newPortrait,
      landscape: newLandscape
    };

    const newContainers = containers.map(c =>
      c.id === containerId ? updatedContainer : c
    );

    state.saveToHistory(newContainers);
    set({ containers: newContainers });
  },

  toggleContainerLock: (id: string) => {
    const container = get().containers.find(c => c.id === id);
    if (!container) return;

    const newContainers = get().containers.map(c => 
      c.id === id 
        ? { 
            ...c, 
            isLocked: !c.isLocked,
            assets: Object.entries(c.assets).reduce((acc, [assetId, asset]) => ({
              ...acc,
              [assetId]: {
                ...asset,
                isLocked: !c.isLocked
              }
            }), {})
          }
        : c
    );
    
    get().saveToHistory(newContainers);
    
    import('./layerStore').then(({ useLayerStore }) => {
      useLayerStore.getState().syncWithLayoutStore();
    });
  },

  toggleAssetLock: (containerId: string, assetId: string) => {
    const state = get();
    const container = state.containers.find(c => c.id === containerId);
    
    if (!container || !container.assets[assetId]) {
      console.error('Container or asset not found');
      return;
    }

    if (container.isLocked) return;

    const updatedContainer = {
      ...container,
      assets: {
        ...container.assets,
        [assetId]: {
          ...container.assets[assetId],
          isLocked: !container.assets[assetId].isLocked
        }
      }
    };

    const newContainers = state.containers.map(c => 
      c.id === containerId ? updatedContainer : c
    );
    
    state.saveToHistory(newContainers);
    
    import('./layerStore').then(({ useLayerStore }) => {
      useLayerStore.getState().syncWithLayoutStore();
    });
  },

  getNextAvailableDepth: (parentId?: string) => {
    const state = get();
    const containers = state.containers;
    
    // Get all siblings (containers with same parent)
    const siblings = containers.filter(c => c.parentId === parentId);
    
    // For root level (no parent), start at 2 and increment by 2
    if (!parentId) {
      const depths = siblings.map(c => c.depth);
      const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;
      return maxDepth + 2;
    }
    
    // For children, use increment of 1
    const depths = siblings.map(c => c.depth);
    const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;
    return maxDepth + 1;
  },

  updateDepth: (id: string, newDepth: number) => {
    const state = get();
    const containers = state.containers;
    const containerIndex = containers.findIndex(c => c.id === id);
    if (containerIndex === -1) return;

    const container = containers[containerIndex];
    const newContainers = containers.map(c =>
      c.id === id ? { ...c, depth: newDepth } : c
    );
    state.saveToHistory(newContainers);
  },

  getAbsoluteDepth: (containerId: string, assetId?: string) => {
    const state = get();
    const containers = state.containers;
    const container = containers.find(c => c.id === containerId);
    if (!container) return 0;

    // Build path from root to container
    const path = [];
    let current = container;
    while (current) {
      path.unshift(current);
      current = current.parentId ? containers.find(c => c.id === current.parentId) : null;
    }

    // Calculate absolute depth using decimal system
    let depth = path[0].depth;
    for (let i = 1; i < path.length; i++) {
      depth = depth + (path[i].depth / Math.pow(100, i));
    }

    // If we're getting depth for an asset, add it at the next decimal place
    if (assetId) {
      const asset = container.assets[assetId];
      if (asset) {
        depth = depth + (asset.depth / Math.pow(100, path.length));
      }
    }

    return Number(depth.toFixed(4)); // Keep 4 decimal places for precision
  },

  reorderDepth: (items: DepthInfo[], targetIndex: number) => {
    const state = get();
    const containers = state.containers;
    const newContainers = containers.map(c => ({
      ...c,
      depth: items.find(i => i.id === c.id)?.depth || 0
    }));
    state.saveToHistory(newContainers);
  },

  moveAsset: (assetId: string, sourceContainerId: string, targetContainerId: string) => {
    const state = get();
    const containers = [...state.containers];
    
    // Find source and target containers
    const sourceContainer = containers.find(c => c.id === sourceContainerId);
    const targetContainer = containers.find(c => c.id === targetContainerId);

    if (!sourceContainer || !targetContainer) {
      console.error('Source or target container not found:', { sourceContainerId, targetContainerId });
      return;
    }

    // Get the asset from source container
    const asset = sourceContainer.assets[assetId];
    if (!asset) {
      console.error('Asset not found:', assetId);
      return;
    }

    // Calculate new depth for the asset in target container
    const newDepth = state.getNextAvailableDepth(targetContainerId);

    // Create updated asset with new depth
    const updatedAsset = {
      ...asset,
      depth: newDepth
    };

    // Remove asset from source container and add to target container
    const newContainers = containers.map(c => {
      if (c.id === sourceContainerId) {
        const { [assetId]: _, ...remainingAssets } = c.assets;
        return { ...c, assets: remainingAssets };
      }
      if (c.id === targetContainerId) {
        return { ...c, assets: { ...c.assets, [assetId]: updatedAsset } };
      }
      return c;
    });

    // Update state
    set((state) => ({
      ...state,
      containers: newContainers,
      selectedAssetId: assetId
    }));

    // Save to history
    state.saveToHistory(newContainers);

    // Force layer store sync
    import('./layerStore').then(({ useLayerStore }) => {
      console.log('[debug] Triggering layer store sync after asset move');
      useLayerStore.getState().syncWithLayoutStore();
    });
  },

  copyOrientationToLandscape: (containerId: string) => {
    const state = get();
    const containers = [...state.containers];
    
    // Helper function to copy container and its children
    const copyContainerOrientation = (container: Container) => {
      // Copy container properties
      container.landscape = { ...container.portrait };
      
      // Copy all assets in the container
      Object.values(container.assets).forEach(asset => {
        asset.landscape = { ...asset.portrait };
      });
      
      // Find and process child containers
      const childContainers = containers.filter(c => c.parentId === container.id);
      childContainers.forEach(copyContainerOrientation);
    };
    
    // Find the target container
    const container = containers.find(c => c.id === containerId);
    if (!container) return;
    
    // Copy orientations
    copyContainerOrientation(container);
    
    // Save to history and update state
    state.saveToHistory(containers);
    set({ containers });
  },

  copyOrientationToPortrait: (containerId: string) => {
    const state = get();
    const containers = [...state.containers];
    
    // Helper function to copy container and its children
    const copyContainerOrientation = (container: Container) => {
      // Copy container properties
      container.portrait = { ...container.landscape };
      
      // Copy all assets in the container
      Object.values(container.assets).forEach(asset => {
        asset.portrait = { ...asset.landscape };
      });
      
      // Find and process child containers
      const childContainers = containers.filter(c => c.parentId === container.id);
      childContainers.forEach(copyContainerOrientation);
    };
    
    // Find the target container
    const container = containers.find(c => c.id === containerId);
    if (!container) return;
    
    // Copy orientations
    copyContainerOrientation(container);
    
    // Save to history and update state
    state.saveToHistory(containers);
    set({ containers });
  },
}));
