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
}

export interface Asset {
  id: string;
  name: string;
  type: 'image';
  key: string;
  portrait: AssetTransform;
  landscape: AssetTransform;
  visible?: boolean;
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

interface LayoutState {
  containers: Container[];
  selectedId: string | null;
  selectedAssetId: string | null;
  selectedDevice: string;
  uploadedImages: { [key: string]: string };
  assetMetadata: { [key: string]: AssetMetadata };
  viewState: {
    portrait: {
      scale: number;
      x: number;
      y: number;
    };
    landscape: {
      scale: number;
      x: number;
      y: number;
    };
  };
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
  uploadImage: (assetId: string, file: File) => void;
  deleteAssetFromLibrary: (assetId: string) => void;
  updateAssetMetadata: (assetId: string, updates: Partial<AssetMetadata>) => void;
  updateAssetKey: (containerId: string, assetId: string, key: string) => void;
  importConfig: (config: { containers: { [key: string]: NestedContainer }; assets: { [key: string]: AssetMetadata } }) => void;
  exportLayout: () => Promise<void>;
  toggleAssetVisibility: (containerId: string, assetId: string) => void;
  updateViewState: (updates: Partial<LayoutState['viewState'][keyof LayoutState['viewState']]>, orientation: 'portrait' | 'landscape') => void;
  resetViewState: (orientation: 'portrait' | 'landscape') => void;
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
  uploadedImages: {},
  assetMetadata: {},
  viewState: {
    portrait: {
      scale: 1,
      x: 0,
      y: 0
    },
    landscape: {
      scale: 1,
      x: 0,
      y: 0
    }
  },

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
      visible: true,
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
        result.assets = Object.entries(container.assets).reduce((acc, [id, asset]) => ({
          ...acc,
          [id]: {
            ...asset,
            name: asset.key
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
      
      // Also remove the asset from any containers that use it
      const updatedContainers = state.containers.map(container => ({
        ...container,
        assets: Object.fromEntries(
          Object.entries(container.assets)
            .filter(([_, asset]) => asset.key !== assetId)
        )
      }));

      return {
        uploadedImages: remainingImages,
        assetMetadata: remainingMetadata,
        containers: updatedContainers
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
              key: asset.name
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

  toggleAssetVisibility: (containerId: string, assetId: string) => {
    set((state) => ({
      containers: state.containers.map(c => 
        c.id === containerId 
          ? {
              ...c,
              assets: {
                ...c.assets,
                [assetId]: {
                  ...c.assets[assetId],
                  visible: c.assets[assetId].visible === undefined ? false : !c.assets[assetId].visible
                },
              },
            }
          : c
      ),
    }));
  },

  updateViewState: (updates, orientation) => {
    set((state) => ({
      viewState: {
        ...state.viewState,
        [orientation]: {
          ...state.viewState[orientation],
          ...updates
        }
      }
    }));
  },

  resetViewState: (orientation) => {
    set((state) => ({
      viewState: {
        ...state.viewState,
        [orientation]: {
          scale: 1,
          x: 0,
          y: 0
        }
      }
    }));
  }
}));
