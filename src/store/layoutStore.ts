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
}

interface NestedContainer {
  portrait: ContainerPosition;
  landscape: ContainerPosition;
  assets?: { [key: string]: Asset };
  children?: { [key: string]: NestedContainer };
}

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
    console.log('addContainer called with parentId:', parentId);
    console.log('Current state:', {
      selectedId: get().selectedId,
      selectedAssetId: get().selectedAssetId
    });
    
    // If an asset is selected and no parentId is provided, we should create a container at root level
    // We don't need to do anything special here, just make sure we don't use the selectedId as parentId
    
    const parent = parentId ? get().containers.find(c => c.id === parentId) : null;
    console.log('Parent container found:', parent ? { id: parent.id, name: parent.name } : null);
    
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

    console.log('New container created:', { id: newContainer.id, name: newContainer.name, parentId: newContainer.parentId });
    
    try {
      const newContainers = [...get().containers, newContainer];
      get().saveToHistory(newContainers);
      
      // Clear the selectedAssetId when creating a new container
      set({ 
        selectedId: newContainer.id,
        selectedAssetId: null 
      });
    } catch (error) {
      console.error('Error creating container:', error);
    }
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
    };

    const newContainers = get().containers.map(c => 
      c.id === containerId 
        ? { ...c, assets: { ...c.assets, [newAsset.id]: newAsset } }
        : c
    );
    get().saveToHistory(newContainers);
    
    // Update the selected asset ID
    set({ selectedAssetId: newAsset.id });
    
    // Also update the layer store to select this asset
    // We need to import this dynamically to avoid circular dependencies
    import('./layerStore').then(({ useLayerStore }) => {
      // Force a sync first to ensure the new asset is in the layer hierarchy
      useLayerStore.getState().syncWithLayoutStore();
      // Then select the new asset
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

    const processContainer = (container: Container): ExportedContainer => {
      const result: ExportedContainer = {
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
        result.assets = Object.entries(container.assets).reduce((acc, [id, asset]) => ({
          ...acc,
          [id]: {
            ...asset,
            name: asset.name,
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
      parentId?: string
    ): Container[] => {
      const selectedDevice = devices[get().selectedDevice];
      return Object.entries(containers).flatMap(([name, container]) => {
        const id = crypto.randomUUID();
        const flatContainer: Container = {
          id,
          name,
          portrait: {
            x: container.portrait.x * selectedDevice.width,
            y: container.portrait.y * selectedDevice.height,
            width: container.portrait.width * selectedDevice.width,
            height: container.portrait.height * selectedDevice.height,
          },
          landscape: {
            x: container.landscape.x * selectedDevice.height,
            y: container.landscape.y * selectedDevice.width,
            width: container.landscape.width * selectedDevice.height,
            height: container.landscape.height * selectedDevice.width,
          },
          parentId,
          assets: container.assets ? Object.entries(container.assets).reduce((acc, [id, asset]) => ({
            ...acc,
            [id]: {
              ...asset,
              key: asset.name,
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
        };

        const children = container.children
          ? flattenContainers(container.children, id)
          : [];

        return [flatContainer, ...children];
      });
    };

    // First, update the containers and metadata
    set((state) => ({
      containers: flattenContainers(config.containers),
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
                  size: 0, // Will be updated when image is uploaded
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

    // Then, initialize uploadedImages with placeholder data
    set((state) => ({
      uploadedImages: {
        ...state.uploadedImages,
        ...Object.values(config.containers).reduce((acc, container) => {
          if (container.assets) {
            Object.values(container.assets).forEach(asset => {
              if (asset.name && !state.uploadedImages[asset.name]) {
                acc[asset.name] = ''; // Placeholder until the actual image is uploaded
              }
            });
          }
          return acc;
        }, {} as { [key: string]: string })
      }
    }));
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

  duplicateAsset: (containerId: string, assetId: string) => {
    const container = get().containers.find(c => c.id === containerId);
    if (!container || !container.assets[assetId]) return;

    const sourceAsset = container.assets[assetId];
    const newAsset: Asset = {
      ...sourceAsset,
      id: crypto.randomUUID(),
      name: `${sourceAsset.name} (Copy)`,
    };

    const newContainers = get().containers.map(c => 
      c.id === containerId 
        ? { ...c, assets: { ...c.assets, [newAsset.id]: newAsset } }
        : c
    );
    get().saveToHistory(newContainers);
    
    // Update the selected asset ID
    set({ selectedAssetId: newAsset.id });
    
    // Also update the layer store to select this asset
    // We need to import this dynamically to avoid circular dependencies
    import('./layerStore').then(({ useLayerStore }) => {
      // Force a sync first to ensure the new asset is in the layer hierarchy
      useLayerStore.getState().syncWithLayoutStore();
      // Then select the new asset
      useLayerStore.getState().selectLayer(newAsset.id);
    });
  },

  reorderContainer: (containerId: string, targetId: string, position: 'before' | 'after' | 'inside') => {
    const state = get();
    const containers = [...state.containers];
    const containerIndex = containers.findIndex(c => c.id === containerId);
    const targetIndex = containers.findIndex(c => c.id === targetId);

    if (containerIndex === -1 || targetIndex === -1) return;

    // Remove the container from its current position
    const [container] = containers.splice(containerIndex, 1);

    // Update parent relationship if needed
    if (position === 'inside') {
      container.parentId = targetId;
    } else {
      // If moving to root level, remove parent
      container.parentId = containers[targetIndex].parentId;
    }

    // Insert at new position
    const newIndex = position === 'after' ? targetIndex + 1 : targetIndex;
    containers.splice(newIndex, 0, container);

    // Save to history and update state
    state.saveToHistory(containers);
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
    console.log('=== Updating Container Parent ===', {
      containerId,
      oldParentId,
      newParentId,
      containerBeforeUpdate: {
        id: container.id,
        parentId: container.parentId,
        position: {
          portrait: container.portrait,
          landscape: container.landscape
        }
      }
    });

    // Get old parent for position calculations
    const oldParent = oldParentId ? containers.find(c => c.id === oldParentId) : null;
    const newParent = newParentId ? containers.find(c => c.id === newParentId) : null;

    // Calculate absolute positions before parent change
    const absolutePortrait = oldParent ? {
      x: container.portrait.x + oldParent.portrait.x,
      y: container.portrait.y + oldParent.portrait.y,
      width: container.portrait.width,
      height: container.portrait.height
    } : container.portrait;

    const absoluteLandscape = oldParent ? {
      x: container.landscape.x + oldParent.landscape.x,
      y: container.landscape.y + oldParent.landscape.y,
      width: container.landscape.width,
      height: container.landscape.height
    } : container.landscape;

    // Calculate new relative positions
    const newPortrait = newParent ? {
      ...container.portrait,
      x: absolutePortrait.x - newParent.portrait.x,
      y: absolutePortrait.y - newParent.portrait.y
    } : absolutePortrait;

    const newLandscape = newParent ? {
      ...container.landscape,
      x: absoluteLandscape.x - newParent.landscape.x,
      y: absoluteLandscape.y - newParent.landscape.y
    } : absoluteLandscape;

    // Update the container with new parent and positions
    containers[containerIndex] = {
      ...container,
      parentId: newParentId || undefined,
      portrait: newPortrait,
      landscape: newLandscape
    };

    console.log('Container after parent update:', {
      updatedContainer: {
        id: containers[containerIndex].id,
        parentId: containers[containerIndex].parentId,
        position: {
          portrait: containers[containerIndex].portrait,
          landscape: containers[containerIndex].landscape
        }
      },
      allContainers: containers.map(c => ({ id: c.id, parentId: c.parentId }))
    });

    // Verify no circular references
    const hasCircularRef = (containerId: string, parentId: string | undefined): boolean => {
      if (!parentId) return false;
      if (parentId === containerId) return true;
      const parent = containers.find(c => c.id === parentId);
      return parent ? hasCircularRef(containerId, parent.parentId) : false;
    };

    if (hasCircularRef(containerId, newParentId || undefined)) {
      console.error('Circular reference detected:', {
        containerId,
        newParentId,
        containers: containers.map(c => ({ id: c.id, parentId: c.parentId }))
      });
      return;
    }

    // Save to history and update state
    state.saveToHistory(containers);
    console.log('Saved updated containers to history');

    // Verify final state
    const finalContainer = containers.find(c => c.id === containerId);
    console.log('Final container state:', {
      container: {
        id: finalContainer?.id,
        parentId: finalContainer?.parentId,
        position: finalContainer ? {
          portrait: finalContainer.portrait,
          landscape: finalContainer.landscape
        } : null
      }
    });
  },
}));
