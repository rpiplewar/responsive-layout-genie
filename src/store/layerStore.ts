import { create } from 'zustand';
import { useLayoutStore, Container, LayoutState, Asset } from './layoutStore';
import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export type DropPosition = 'before' | 'after' | 'inside' | null;

export interface DragState {
  draggingId: string | null;
  dropTargetId: string | null;
  dropPosition: DropPosition;
}

export interface LayerState extends Pick<LayoutState, 'containers' | 'selectedId'> {
  // Layer-specific state
  expandedLayers: Set<string>;
  layerVisibility: Map<string, boolean>;
  dragState: DragState;
  
  // Layer actions that work with existing container structure
  toggleLayerExpansion: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  getLayerHierarchy: () => LayerNode[];
  
  // Selection handling that works with existing selection system
  selectLayer: (id: string | null, event?: React.MouseEvent | MouseEvent) => void;
  getSelectedLayer: () => LayerNode | null;
  
  // Drag and drop actions
  startDrag: (id: string) => void;
  updateDrag: (targetId: string | null, position: DropPosition) => void;
  endDrag: () => void;
  
  // Sync with layout store
  syncWithLayoutStore: () => void;
}

export interface LayerNode {
  id: string;
  name: string;
  type: 'container' | 'asset';
  isExpanded: boolean;
  isVisible: boolean;
  isLocked: boolean;
  children: LayerNode[];
  parentId: string | null;
  level: number;
  depth: number;
}

export const useLayerStore = create<LayerState>((set, get) => ({
  // Reuse existing container and selection state
  containers: [],
  selectedId: null,
  expandedLayers: new Set<string>(),
  layerVisibility: new Map<string, boolean>(),
  dragState: {
    draggingId: null,
    dropTargetId: null,
    dropPosition: null
  },

  // Layer tree actions
  toggleLayerExpansion: (id: string) => {
    set((state) => {
      const newExpanded = new Set(state.expandedLayers);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return { expandedLayers: newExpanded };
    });
  },

  toggleLayerVisibility: (id: string) => {
    set((state) => {
      const newVisibility = new Map(state.layerVisibility);
      const currentVisibility = newVisibility.get(id) ?? true;
      newVisibility.set(id, !currentVisibility);
      return { layerVisibility: newVisibility };
    });
  },

  // Hierarchy computation that works with existing container structure
  getLayerHierarchy: () => {
    const state = get();
    const layoutStore = useLayoutStore.getState();
    
    // Build a map of parent-child relationships first
    const childrenMap = new Map<string, string[]>();
    state.containers.forEach(container => {
      const parentId = container.parentId;
      if (parentId) {
        const children = childrenMap.get(parentId) || [];
        children.push(container.id);
        childrenMap.set(parentId, children);
      }
    });
    
    const buildNode = (container: Container, level: number = 0): LayerNode => {

      const node: LayerNode = {
        id: container.id,
        name: container.name,
        type: 'container',
        isExpanded: state.expandedLayers.has(container.id),
        isVisible: state.layerVisibility.get(container.id) ?? true,
        isLocked: container.isLocked ?? false,
        children: [],
        parentId: container.parentId || null,
        level,
        depth: container.depth
      };

      // First add child containers (sorted by depth)
      const childContainerIds = childrenMap.get(container.id) || [];
      const childContainers = childContainerIds
        .map(childId => state.containers.find(c => c.id === childId))
        .filter((c): c is Container => c !== undefined)
        .sort((a, b) => b.depth - a.depth); // Higher depth on top

      childContainers.forEach(childContainer => {
        node.children.push(buildNode(childContainer, level + 1));
      });

      // Then add assets (sorted by depth)
      const assets = Object.entries(container.assets)
        .map(([id, asset]) => ({ id, asset }))
        .sort((a, b) => b.asset.depth - a.asset.depth);

      assets.forEach(({ id, asset }) => {
        const isLocked = container.isLocked || asset.isLocked;

        node.children.push({
          id,
          name: asset.name,
          type: 'asset',
          isExpanded: false,
          isVisible: asset.portrait.isVisible ?? true,
          isLocked: isLocked,
          children: [],
          parentId: container.id,
          level: level + 1,
          depth: asset.depth
        });
      });

      return node;
    };

    // Process root containers (sorted by depth)
    const rootContainers = state.containers
      .filter(container => !container.parentId)
      .sort((a, b) => b.depth - a.depth); // Higher depth on top

    const hierarchy = rootContainers.map(container => buildNode(container, 0));
    
    return hierarchy;
  },

  // Selection handling that integrates with existing system
  selectLayer: (id: string | null, event?: React.MouseEvent | MouseEvent) => {
    // Find the selected node to determine if it's an asset
    if (id) {
      const findNode = (nodes: LayerNode[]): LayerNode | null => {
        for (const node of nodes) {
          if (node.id === id) return node;
          for (const child of node.children) {
            if (child.id === id) return child;
            const found = findNode([child]);
            if (found) return found;
          }
        }
        return null;
      };
      
      const hierarchy = get().getLayerHierarchy();
      const selectedNode = findNode(hierarchy);
      
      if (selectedNode) {
        const layoutStore = useLayoutStore.getState();
        
        if (selectedNode.type === 'asset') {
          // If it's an asset, set both container ID and asset ID
          layoutStore.setSelectedId(selectedNode.parentId);
          layoutStore.setSelectedAssetId(selectedNode.id);
          set({ selectedId: selectedNode.id }); // Also update layer store selection
        } else {
          // If it's a container, just set the container ID and clear asset ID
          layoutStore.setSelectedId(id);
          layoutStore.setSelectedAssetId(null);
          set({ selectedId: id });
        }
      }
    } else {
      // If nothing is selected, clear both selections
      useLayoutStore.getState().setSelectedId(null);
      useLayoutStore.getState().setSelectedAssetId(null);
      set({ selectedId: null });
    }
  },

  getSelectedLayer: () => {
    const state = get();
    if (!state.selectedId) return null;
    
    const findNode = (nodes: LayerNode[]): LayerNode | null => {
      for (const node of nodes) {
        if (node.id === state.selectedId) return node;
        const found = findNode(node.children);
        if (found) return found;
      }
      return null;
    };

    return findNode(state.getLayerHierarchy());
  },

  // Sync with layout store
  syncWithLayoutStore: () => {
    const layoutStore = useLayoutStore.getState();
    const state = get();
    
    if (!layoutStore.containers) {
      return;
    }
    
    // Ensure lock states are properly synced
    const containersWithLockStates = layoutStore.containers.map(container => {
      return {
        ...container,
        isLocked: container.isLocked ?? false,
        assets: Object.entries(container.assets).reduce((acc, [id, asset]) => ({
          ...acc,
          [id]: {
            ...asset,
            isLocked: container.isLocked || (asset.isLocked ?? false)
          }
        }), {})
      };
    });
    
    // Update containers and selected ID from layout store
    set({
      containers: containersWithLockStates,
      // If there's a selected asset, use that as the selected ID, otherwise use the container ID
      selectedId: layoutStore.selectedAssetId || layoutStore.selectedId
    });
  },

  // Drag and drop actions
  startDrag: (id: string) => {
    set((state) => ({
      dragState: {
        draggingId: id,
        dropTargetId: null,
        dropPosition: null
      }
    }));
  },

  updateDrag: (targetId: string | null, position: DropPosition) => {
    set((state) => {
      // Don't allow dropping on itself
      if (targetId === state.dragState.draggingId) {
        return state;
      }

      // Allow dropping at root level when targetId is null
      if (!targetId) {
        return {
          dragState: {
            ...state.dragState,
            dropTargetId: null,
            dropPosition: 'after'
          }
        };
      }

      // Don't allow dropping inside children of the dragging item
      if (position === 'inside') {
        const hierarchy = get().getLayerHierarchy();
        const isChild = (parent: LayerNode[], targetId: string): boolean => {
          for (const node of parent) {
            if (node.id === targetId) return true;
            if (node.children.length > 0 && isChild(node.children, targetId)) return true;
          }
          return false;
        };

        // Find the dragging node in the hierarchy
        const findNode = (nodes: LayerNode[], id: string): LayerNode | null => {
          for (const node of nodes) {
            if (node.id === id) return node;
            const found = findNode(node.children, id);
            if (found) return found;
          }
          return null;
        };

        const draggingNode = findNode(hierarchy, state.dragState.draggingId);
        if (draggingNode && draggingNode.type === 'container' && isChild(draggingNode.children, targetId)) {
          return state;
        }
      }

      return {
        dragState: {
          ...state.dragState,
          dropTargetId: targetId,
          dropPosition: position
        }
      };
    });
  },

  endDrag: () => {
    const state = get();
    const { draggingId, dropTargetId, dropPosition } = state.dragState;

    console.log('[debug] Starting drag end operation:', {
      draggingId,
      dropTargetId,
      dropPosition
    });

    if (!draggingId) {
      console.log('[debug] No dragging ID found, aborting drag end');
      return;
    }

    const layoutStore = useLayoutStore.getState();
    const isAsset = !layoutStore.containers.some(c => c.id === draggingId);
    
    console.log('[debug] Identified item type:', {
      isAsset,
      draggingId,
      foundInContainers: layoutStore.containers.map(c => ({
        containerId: c.id,
        hasAsset: !!c.assets[draggingId]
      }))
    });
    
    if (isAsset) {
      // Handle asset movement
      let sourceContainerId: string | null = null;
      let assetData: Asset | null = null;
      
      for (const container of layoutStore.containers) {
        if (container.assets[draggingId]) {
          sourceContainerId = container.id;
          assetData = container.assets[draggingId];
          break;
        }
      }
      
      console.log('[debug] Asset movement details:', {
        sourceContainerId,
        assetFound: !!assetData,
        targetContainerId: dropTargetId,
        dropPosition
      });
      
      if (!sourceContainerId || !assetData) {
        console.log('[debug] Asset or source container not found');
        return;
      }

      // Find target container based on drop target ID
      let targetContainer = null;
      if (dropTargetId && (dropPosition === 'before' || dropPosition === 'after')) {
        // For reordering, find container that has the target asset
        targetContainer = layoutStore.containers.find(c => {
          return Object.keys(c.assets).includes(dropTargetId);
        });
      } else if (dropTargetId && dropPosition === 'inside') {
        // For moving into container, find container by ID
        targetContainer = layoutStore.containers.find(c => c.id === dropTargetId);
      }

      if (!targetContainer) {
        console.log('[debug] Target container not found');
        return;
      }

      // Handle reordering within same container
      if (dropTargetId && (dropPosition === 'before' || dropPosition === 'after')) {
        console.log('[debug] Reordering asset within container:', {
          sourceContainerId,
          targetAssetId: dropTargetId,
          position: dropPosition
        });

        const targetAsset = targetContainer.assets[dropTargetId];
        if (!targetAsset) {
          console.log('[debug] Target asset not found');
          return;
        }

        // Calculate new position based on target asset's position
        const newPosition = dropPosition === 'before' 
          ? targetAsset.depth + 10  // Place slightly above target
          : targetAsset.depth - 10; // Place slightly below target

        console.log('[debug] Calculated new asset position:', {
          targetPosition: targetAsset.depth,
          newPosition,
          dropPosition
        });

        // Update the asset's position
        const updatedContainers = layoutStore.containers.map(container => {
          if (container.id === sourceContainerId) {
            return {
              ...container,
              assets: {
                ...container.assets,
                [draggingId]: {
                  ...assetData,
                  depth: newPosition
                }
              }
            };
          }
          return container;
        });

        console.log('[debug] Updating asset position:', {
          assetId: draggingId,
          oldPosition: assetData.depth,
          newPosition
        });

        layoutStore.saveToHistory(updatedContainers);
        layoutStore.setSelectedId(sourceContainerId);
        layoutStore.setSelectedAssetId(draggingId);
      } else if (dropTargetId && dropPosition === 'inside') {
        console.log('[debug] Found target container:', {
          targetFound: !!targetContainer,
          targetId: dropTargetId,
          isSameContainer: sourceContainerId === dropTargetId
        });

        if (!targetContainer || sourceContainerId === dropTargetId) {
          console.log('[debug] Invalid target container or same container');
          return;
        }
        
        // Get siblings in target container for depth calculation
        const siblings = Object.values(targetContainer.assets);
        const newPosition = layoutStore.getNextAvailableDepth(dropTargetId);
        
        console.log('[debug] Calculating new asset position:', {
          targetContainerId: dropTargetId,
          currentSiblings: siblings.length,
          newPosition
        });
        
        // Update asset with new container and depth
        const updatedContainers = layoutStore.containers.map(container => {
          if (container.id === sourceContainerId) {
            const { [draggingId]: _, ...remainingAssets } = container.assets;
            return { ...container, assets: remainingAssets };
          } else if (container.id === dropTargetId) {
            return {
              ...container,
              assets: {
                ...container.assets,
                [draggingId]: {
                  ...assetData,
                  depth: newPosition
                }
              }
            };
          }
          return container;
        });
        
        console.log('[debug] Updating containers for asset move:', {
          sourceContainerId,
          targetContainerId: dropTargetId,
          assetId: draggingId,
          newPosition
        });
        
        layoutStore.saveToHistory(updatedContainers);
        layoutStore.setSelectedId(dropTargetId);
        layoutStore.setSelectedAssetId(draggingId);
      }
    } else {
      // Handle container movement
      const container = layoutStore.containers.find(c => c.id === draggingId);
      console.log('[debug] Container movement details:', {
        containerFound: !!container,
        containerId: draggingId,
        targetId: dropTargetId,
        position: dropPosition
      });

      if (!container) {
        console.log('[debug] Container not found');
        return;
      }
      
      if (dropTargetId && dropPosition === 'inside') {
        console.log('[debug] Moving container inside target:', {
          containerId: draggingId,
          targetId: dropTargetId
        });
        
        // Update container parent and recalculate depth
        const updatedContainers = layoutStore.containers.map(c =>
          c.id === draggingId ? { 
            ...c, 
            parentId: dropTargetId,
            level: c.level + 1,
            depth: layoutStore.getNextAvailableDepth(dropTargetId)
          } : c
        );
        
        console.log('[debug] Updated container hierarchy:', {
          containerId: draggingId,
          newParentId: dropTargetId,
          newLevel: container.level + 1
        });
        
        layoutStore.saveToHistory(updatedContainers);
      } else if (dropTargetId && dropPosition !== 'inside') {
        const targetContainer = layoutStore.containers.find(c => c.id === dropTargetId);
        if (!targetContainer) {
          console.log('[debug] Target container not found');
          return;
        }
        
        console.log('[debug] Moving container relative to target:', {
          containerId: draggingId,
          targetId: dropTargetId,
          position: dropPosition,
          targetParentId: targetContainer.parentId
        });
        
        // Get siblings at target level
        const siblings = layoutStore.containers.filter(c => 
          c.parentId === targetContainer.parentId && c.id !== draggingId
        );
        
        // Calculate new depth based on drop position
        const newPosition = layoutStore.getNextAvailableDepth(targetContainer.parentId);
        
        console.log('[debug] Calculating new container position:', {
          currentSiblings: siblings.length,
          newPosition,
          targetParentId: targetContainer.parentId
        });
        
        // Update container depth and parent
        const updatedContainers = layoutStore.containers.map(c =>
          c.id === draggingId ? { 
            ...c, 
            parentId: targetContainer.parentId,
            level: targetContainer.level,
            depth: newPosition 
          } : c
        );
        
        console.log('[debug] Updated container position:', {
          containerId: draggingId,
          newParentId: targetContainer.parentId,
          newLevel: targetContainer.level,
          newPosition
        });
        
        layoutStore.saveToHistory(updatedContainers);
      }
    }
    
    // Clear drag state
    set({ dragState: { draggingId: null, dropTargetId: null, dropPosition: null } });
    console.log('[debug] Syncing layer store after movement');
    get().syncWithLayoutStore();
  }
}));

// Hook to keep layer store in sync with layout store
export const useSyncLayerStore = () => {
  useEffect(() => {
    const unsubscribe = useLayoutStore.subscribe((state) => {
      useLayerStore.getState().syncWithLayoutStore();
    });

    // Initial sync
    useLayerStore.getState().syncWithLayoutStore();

    return () => {
      unsubscribe();
    };
  }, []);
}; 