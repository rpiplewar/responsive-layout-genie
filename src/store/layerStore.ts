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
    console.log('=== Computing Layer Hierarchy ===', {
      containers: state.containers.map(c => ({ id: c.id, parentId: c.parentId }))
    });
    
    const buildNode = (container: Container, level: number = 0): LayerNode => {
      const node: LayerNode = {
        id: container.id,
        name: container.name,
        type: 'container',
        isExpanded: state.expandedLayers.has(container.id),
        isVisible: state.layerVisibility.get(container.id) ?? true,
        children: [],
        parentId: container.parentId || null,
        level
      };
      console.log('Building node:', { 
        id: node.id, 
        parentId: node.parentId, 
        level,
        containerParentId: container.parentId 
      });

      // Add assets as children
      Object.entries(container.assets).forEach(([id, asset]) => {
        node.children.push({
          id,
          name: asset.name,
          type: 'asset',
          isExpanded: false,
          isVisible: asset.portrait.isVisible ?? true,
          children: [],
          parentId: container.id,
          level: level + 1
        });
      });

      return node;
    };

    const nodes = new Map<string, LayerNode>();
    const rootNodes: LayerNode[] = [];

    // First pass: create all nodes
    state.containers.forEach(container => {
      const node = buildNode(container, container.parentId ? 1 : 0);
      nodes.set(container.id, node);
      if (!container.parentId) {
        console.log('Adding root node:', { 
          id: node.id, 
          parentId: node.parentId,
          containerParentId: container.parentId 
        });
        rootNodes.push(node);
      }
    });

    // Second pass: build hierarchy
    state.containers.forEach(container => {
      if (container.parentId) {
        const parentNode = nodes.get(container.parentId);
        const currentNode = nodes.get(container.id);
        if (parentNode && currentNode) {
          console.log('Building hierarchy - Adding child to parent:', { 
            childId: currentNode.id, 
            childParentId: currentNode.parentId,
            parentId: parentNode.id,
            containerParentId: container.parentId 
          });
          parentNode.children.unshift(currentNode); // Add containers before assets
        } else {
          console.error('Building hierarchy - Missing nodes:', {
            containerId: container.id,
            containerParentId: container.parentId,
            hasParentNode: !!parentNode,
            hasCurrentNode: !!currentNode
          });
        }
      }
    });

    console.log('=== Final Layer Hierarchy ===', {
      rootNodes: rootNodes.map(node => ({ 
        id: node.id, 
        parentId: node.parentId,
        children: node.children.map(child => ({ id: child.id, parentId: child.parentId }))
      }))
    });

    return rootNodes;
  },

  // Selection handling that integrates with existing system
  selectLayer: (id: string | null, event?: React.MouseEvent | MouseEvent) => {
    set({ selectedId: id });
    
    // Find the selected node to determine if it's an asset
    if (id) {
      const findNode = (nodes: LayerNode[]): LayerNode | null => {
        for (const node of nodes) {
          if (node.id === id) return node;
          const found = findNode(node.children);
          if (found) return found;
        }
        return null;
      };
      
      const hierarchy = get().getLayerHierarchy();
      const selectedNode = findNode(hierarchy);
      
      if (selectedNode) {
        const layoutStore = useLayoutStore.getState();
        
        if (selectedNode.type === 'asset') {
          // If it's an asset, set the container ID and asset ID
          layoutStore.setSelectedId(selectedNode.parentId);
          layoutStore.setSelectedAssetId(selectedNode.id);
        } else {
          // If it's a container, just set the container ID and clear asset ID
          layoutStore.setSelectedId(id);
          layoutStore.setSelectedAssetId(null);
        }
      }
    } else {
      // If nothing is selected, clear both selections
      useLayoutStore.getState().setSelectedId(null);
      useLayoutStore.getState().setSelectedAssetId(null);
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
    
    console.log('=== Starting sync with layout store ===');
    console.log('Layout store containers:', layoutStore.containers);
    console.log('Current layer store containers:', state.containers);
    
    if (!layoutStore.containers) {
      console.error('Invalid layout state:', layoutStore);
      return;
    }
    
    // Update containers and selected ID from layout store
    set({
      containers: layoutStore.containers,
      selectedId: layoutStore.selectedId
    });
    
    console.log('=== After sync ===');
    console.log('Updated layer store containers:', get().containers);
    console.log('Building hierarchy...');
    const hierarchy = get().getLayerHierarchy();
    console.log('Final hierarchy:', hierarchy);
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