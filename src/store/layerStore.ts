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
      if (container.parentId) {
        const children = childrenMap.get(container.parentId) || [];
        children.push(container.id);
        childrenMap.set(container.parentId, children);
      }
    });
    
    const buildNode = (container: Container, level: number = 0): LayerNode => {
      console.log('[debug] Building node for container:', {
        id: container.id,
        name: container.name,
        isLocked: container.isLocked,
        level,
        parentId: container.parentId,
        assetCount: Object.keys(container.assets).length,
        assets: Object.entries(container.assets).map(([id, asset]) => ({
          id,
          name: asset.name,
          isLocked: asset.isLocked
        }))
      });

      const node: LayerNode = {
        id: container.id,
        name: container.name,
        type: 'container',
        isExpanded: state.expandedLayers.has(container.id),
        isVisible: state.layerVisibility.get(container.id) ?? true,
        isLocked: container.isLocked ?? false,
        children: [],
        parentId: container.parentId || null,
        level
      };

      // First add child containers
      const childContainerIds = childrenMap.get(container.id) || [];
      childContainerIds.forEach(childId => {
        const childContainer = state.containers.find(c => c.id === childId);
        if (childContainer) {
          node.children.push(buildNode(childContainer, level + 1));
        }
      });

      // Then add assets with proper lock states
      Object.entries(container.assets).forEach(([id, asset]) => {
        console.log('[debug] Building node for asset:', {
          id,
          name: asset.name,
          isLocked: asset.isLocked,
          parentId: container.id,
          level: level + 1,
          containerLocked: container.isLocked
        });

        // If container is locked, all assets should be locked
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
          level: level + 1
        });
      });

      return node;
    };

    // Only process root containers (those without parents)
    const rootNodes = state.containers
      .filter(container => !container.parentId)
      .map(container => buildNode(container, 0));

    console.log('[debug] Final hierarchy details:', {
      totalNodes: rootNodes.length,
      selectedId: state.selectedId,
      rootNodes: rootNodes.map(node => ({
        id: node.id,
        name: node.name,
        isLocked: node.isLocked,
        childCount: node.children.length,
        children: node.children.map(child => ({
          id: child.id,
          name: child.name,
          type: child.type,
          isLocked: child.isLocked,
          parentId: child.parentId,
          level: child.level
        }))
      }))
    });

    return rootNodes;
  },

  // Selection handling that integrates with existing system
  selectLayer: (id: string | null, event?: React.MouseEvent | MouseEvent) => {
    console.log('[debug] Layer selection attempt:', { id });
    
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
      console.log('[debug] Found selected node:', { 
        selectedNode,
        nodeType: selectedNode?.type,
        parentId: selectedNode?.parentId,
        level: selectedNode?.level
      });
      
      if (selectedNode) {
        const layoutStore = useLayoutStore.getState();
        
        if (selectedNode.type === 'asset') {
          console.log('[debug] Selecting asset:', { 
            parentId: selectedNode.parentId, 
            assetId: selectedNode.id,
            assetName: selectedNode.name,
            level: selectedNode.level
          });
          // If it's an asset, set both container ID and asset ID
          layoutStore.setSelectedId(selectedNode.parentId);
          layoutStore.setSelectedAssetId(selectedNode.id);
          set({ selectedId: selectedNode.id }); // Also update layer store selection
        } else {
          console.log('[debug] Selecting container:', { 
            containerId: id,
            containerName: selectedNode.name,
            level: selectedNode.level
          });
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
      console.error('[debug] Invalid layout state:', layoutStore);
      return;
    }
    
    console.log('[debug] Starting sync with layout store:', {
      layoutSelectedId: layoutStore.selectedId,
      layoutSelectedAssetId: layoutStore.selectedAssetId,
      currentSelectedId: state.selectedId,
      containers: layoutStore.containers.map(c => ({
        id: c.id,
        name: c.name,
        isLocked: c.isLocked,
        assetCount: Object.keys(c.assets).length,
        assets: Object.entries(c.assets).map(([id, asset]) => ({
          id,
          name: asset.name,
          isLocked: asset.isLocked
        }))
      }))
    });
    
    // Ensure lock states are properly synced
    const containersWithLockStates = layoutStore.containers.map(container => {
      console.log('[debug] Processing container lock states:', {
        containerId: container.id,
        containerName: container.name,
        containerLocked: container.isLocked,
        assetLockStates: Object.entries(container.assets).map(([id, asset]) => ({
          id,
          name: asset.name,
          isLocked: asset.isLocked
        }))
      });

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
    
    // Force hierarchy rebuild and log the result
    const hierarchy = get().getLayerHierarchy();
    console.log('[debug] Sync complete - Current hierarchy:', {
      totalNodes: hierarchy.length,
      selectedId: get().selectedId,
      hierarchySnapshot: hierarchy.map(node => ({
        id: node.id,
        name: node.name,
        type: 'container',
        level: node.level,
        isLocked: node.isLocked,
        childCount: node.children.length,
        children: node.children.map(child => ({
          id: child.id,
          name: child.name,
          type: child.type,
          level: child.level,
          isLocked: child.isLocked,
          parentId: child.parentId
        }))
      }))
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

    if (!draggingId) {
      return;
    }

    const layoutStore = useLayoutStore.getState();
    
    // Check if we're dragging an asset or a container
    const isAsset = !layoutStore.containers.some(c => c.id === draggingId);
    
    if (isAsset) {
      // Handle asset movement
      // First, find which container contains this asset
      let sourceContainerId: string | null = null;
      let assetData: Asset | null = null;
      
      for (const container of layoutStore.containers) {
        if (container.assets[draggingId]) {
          sourceContainerId = container.id;
          assetData = container.assets[draggingId];
          break;
        }
      }
      
      if (!sourceContainerId || !assetData) {
        console.error('Asset not found:', draggingId);
        return;
      }
      
      console.log('=== Asset Movement Debug ===', {
        assetId: draggingId,
        sourceContainerId,
        dropTargetId,
        dropPosition
      });
      
      // If dropping inside a container, move the asset to that container
      if (dropTargetId && dropPosition === 'inside') {
        const targetContainer = layoutStore.containers.find(c => c.id === dropTargetId);
        if (!targetContainer) {
          console.error('Target container not found:', dropTargetId);
          return;
        }
        
        // Don't move if source and target are the same
        if (sourceContainerId === dropTargetId) {
          console.log('Source and target containers are the same, no movement needed');
          return;
        }
        
        console.log('Moving asset between containers:', {
          assetId: draggingId,
          fromContainer: sourceContainerId,
          toContainer: dropTargetId
        });
        
        try {
          // Create updated containers
          const updatedContainers = layoutStore.containers.map(container => {
            if (container.id === sourceContainerId) {
              // Remove asset from source container
              const { [draggingId]: _, ...remainingAssets } = container.assets;
              return {
                ...container,
                assets: remainingAssets
              };
            } else if (container.id === dropTargetId) {
              // Add asset to target container
              return {
                ...container,
                assets: {
                  ...container.assets,
                  [draggingId]: assetData
                }
              };
            }
            return container;
          });
          
          // Save changes
          layoutStore.saveToHistory(updatedContainers);
          
          // Update selection to the moved asset in its new container
          layoutStore.setSelectedId(dropTargetId);
          layoutStore.setSelectedAssetId(draggingId);
          
          // Force immediate sync
          get().syncWithLayoutStore();
        } catch (error) {
          console.error('Error moving asset between containers:', error);
        }
      } else if (!dropTargetId && dropPosition === 'after') {
        // If dropping at root level, we can't move assets to root
        // Assets must be inside a container
        console.error('Cannot move assets to root level - assets must be inside a container');
        
        // Show a toast notification to the user
        toast({
          title: "Cannot move asset to root level",
          description: "Assets must be placed inside a container",
          variant: "destructive",
        });
      }
    } else {
      // Handle container movement
      const container = layoutStore.containers.find(c => c.id === draggingId);
      
      if (!container) {
        console.error('Container not found:', draggingId);
        return;
      }

      console.log('=== Container Movement Debug ===', {
        draggingId,
        dropTargetId,
        dropPosition,
        container,
        containerParentId: container.parentId,
        allContainers: layoutStore.containers.map(c => ({ id: c.id, parentId: c.parentId }))
      });

      if (!dropTargetId && dropPosition === 'after') {
        // Moving to root level
        console.log('Moving to root level - Initial state:', {
          container,
          oldParentId: container.parentId,
          allContainers: layoutStore.containers.map(c => ({ id: c.id, parentId: c.parentId }))
        });
        
        const oldParent = layoutStore.containers.find(c => c.id === container.parentId);
        
        // Create updated container with all changes
        const updatedContainer = {
          ...container,
          parentId: null, // Explicitly set to null instead of undefined
          portrait: oldParent ? {
            ...container.portrait,
            x: container.portrait.x + oldParent.portrait.x,
            y: container.portrait.y + oldParent.portrait.y
          } : container.portrait,
          landscape: oldParent ? {
            ...container.landscape,
            x: container.landscape.x + oldParent.landscape.x,
            y: container.landscape.y + oldParent.landscape.y
          } : container.landscape
        };
        
        // Remove from old position and add to end
        const updatedContainers = layoutStore.containers
          .filter(c => c.id !== container.id)
          .concat(updatedContainer);
        
        console.log('Moving to root level - Updated state:', {
          before: container,
          after: updatedContainer,
          updatedContainers: updatedContainers.map(c => ({ id: c.id, parentId: c.parentId }))
        });
        
        // Verify the update
        const hasParentRelation = updatedContainers.some(c => c.parentId === container.id);
        if (hasParentRelation) {
          console.error('Invalid state: Container still has parent relations');
          return;
        }
        
        // Save all changes in a single operation
        layoutStore.saveToHistory(updatedContainers);
        
        // Force immediate sync and verify
        get().syncWithLayoutStore();
        
        // Verify the hierarchy after sync
        const hierarchy = get().getLayerHierarchy();
        console.log('Verification after move to root:', {
          isRoot: hierarchy.some(node => node.id === draggingId),
          hierarchy: hierarchy.map(node => ({ id: node.id, parentId: node.parentId }))
        });
      } else if (dropTargetId) {
        // Moving to another container
        const targetContainer = layoutStore.containers.find(c => c.id === dropTargetId);
        if (!targetContainer) {
          console.error('Target container not found:', dropTargetId);
          return;
        }
        
        console.log('Moving to container - Initial state:', {
          sourceContainer: container,
          targetContainer,
          dropPosition,
          allContainers: layoutStore.containers.map(c => ({ id: c.id, parentId: c.parentId }))
        });

        if (dropPosition === 'inside') {
          // Update position to be relative to new parent
          const newPortrait = {
            ...container.portrait,
            x: container.portrait.x - targetContainer.portrait.x,
            y: container.portrait.y - targetContainer.portrait.y
          };
          const newLandscape = {
            ...container.landscape,
            x: container.landscape.x - targetContainer.landscape.x,
            y: container.landscape.y - targetContainer.landscape.y
          };
          
          // Create updated container with all changes
          const updatedContainer = {
            ...container,
            parentId: targetContainer.id,
            portrait: newPortrait,
            landscape: newLandscape
          };
          
          // Update containers array with the modified container
          const updatedContainers = layoutStore.containers
            .filter(c => c.id !== container.id)
            .concat(updatedContainer);
          
          console.log('Moving inside container - Updated state:', {
            before: container,
            after: updatedContainer,
            updatedContainers: updatedContainers.map(c => ({ id: c.id, parentId: c.parentId }))
          });
          
          // Verify the update
          const hasCorrectParent = updatedContainers.find(c => c.id === container.id)?.parentId === targetContainer.id;
          if (!hasCorrectParent) {
            console.error('Invalid state: Container parent not updated correctly');
            return;
          }
          
          // Save all changes in a single operation
          layoutStore.saveToHistory(updatedContainers);
          
          // Force immediate sync to ensure hierarchy is updated
          get().syncWithLayoutStore();
        } else {
          // Moving before/after another container
          const newParentId = targetContainer.parentId;
          
          // Calculate position adjustments based on parent changes
          const oldParent = container.parentId ? layoutStore.containers.find(c => c.id === container.parentId) : null;
          const newParent = newParentId ? layoutStore.containers.find(c => c.id === newParentId) : null;
          
          // Calculate absolute positions (relative to canvas)
          const absolutePortrait = {
            ...container.portrait,
            x: container.portrait.x + (oldParent ? oldParent.portrait.x : 0),
            y: container.portrait.y + (oldParent ? oldParent.portrait.y : 0)
          };
          
          const absoluteLandscape = {
            ...container.landscape,
            x: container.landscape.x + (oldParent ? oldParent.landscape.x : 0),
            y: container.landscape.y + (oldParent ? oldParent.landscape.y : 0)
          };
          
          // Calculate new relative positions based on new parent
          const newPortrait = {
            ...container.portrait,
            x: absolutePortrait.x - (newParent ? newParent.portrait.x : 0),
            y: absolutePortrait.y - (newParent ? newParent.portrait.y : 0)
          };
          
          const newLandscape = {
            ...container.landscape,
            x: absoluteLandscape.x - (newParent ? newParent.landscape.x : 0),
            y: absoluteLandscape.y - (newParent ? newParent.landscape.y : 0)
          };
          
          // Create updated container with all changes
          const updatedContainer = {
            ...container,
            parentId: newParentId,
            portrait: newPortrait,
            landscape: newLandscape
          };
          
          console.log('Moving before/after container - Position calculation:', {
            oldParent: oldParent ? { id: oldParent.id, position: oldParent.portrait } : null,
            newParent: newParent ? { id: newParent.id, position: newParent.portrait } : null,
            absolutePortrait,
            newPortrait
          });
          
          // Update containers array with the modified container
          const containers = layoutStore.containers
            .filter(c => c.id !== container.id);
          
          // Find the correct position to insert the container
          const targetIndex = containers.findIndex(c => c.id === targetContainer.id);
          const insertIndex = dropPosition === 'after' ? targetIndex + 1 : targetIndex;
          
          // Insert the container at the correct position
          containers.splice(insertIndex, 0, updatedContainer);
          
          console.log('Moving before/after container - Updated state:', {
            before: container,
            after: updatedContainer,
            updatedContainers: containers.map(c => ({ id: c.id, parentId: c.parentId }))
          });
          
          // Verify the update
          const insertedContainer = containers.find(c => c.id === container.id);
          if (!insertedContainer) {
            console.error('Invalid state: Container not inserted correctly');
            return;
          }
          
          if (insertedContainer.parentId !== newParentId) {
            console.error('Invalid state: Container parent not updated correctly', {
              expected: newParentId,
              actual: insertedContainer.parentId
            });
            return;
          }
          
          // Save all changes in a single operation
          layoutStore.saveToHistory(containers);
          
          // Force immediate sync to ensure hierarchy is updated
          get().syncWithLayoutStore();
        }
      }
    }

    // Reset drag state
    set({
      dragState: {
        draggingId: null,
        dropTargetId: null,
        dropPosition: null
      }
    });
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