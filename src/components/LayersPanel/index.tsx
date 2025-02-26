import React from 'react';
import { useLayerStore, LayerNode, DropPosition } from '@/store/layerStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, ChevronDown, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLayoutStore } from '@/store/layoutStore';

interface LayerItemProps {
  id: string;
  name: string;
  level: number;
  isExpanded: boolean;
  isVisible: boolean;
  isSelected: boolean;
  isLocked: boolean;
  hasChildren: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  dropPosition: DropPosition;
  onToggleExpand: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onSelect: (id: string, event: React.MouseEvent) => void;
  type: string;
}

const LayerItem: React.FC<LayerItemProps> = ({
  id,
  name,
  level,
  isExpanded,
  isVisible,
  isSelected,
  isLocked,
  hasChildren,
  isDragging,
  isDropTarget,
  dropPosition,
  onToggleExpand,
  onToggleVisibility,
  onToggleLock,
  onSelect,
  type,
}) => {
  const { startDrag, updateDrag, endDrag } = useLayerStore();

  const handleDragStart = (e: React.DragEvent) => {
    if (isLocked) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    startDrag(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.setData('text/type', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const draggedType = e.dataTransfer.getData('text/type');
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const threshold = rect.height / 3;

    // Only allow dropping assets into containers
    if (draggedType === 'asset' && type !== 'container') {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    let position: DropPosition = 'before';
    if (y > rect.height - threshold) {
      position = 'after';
    } else if (y > threshold && y < rect.height - threshold && type === 'container') {
      position = 'inside';
    }

    updateDrag(id, position);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    endDrag();
  };

  return (
    <div
      className={cn(
        'flex items-center px-2 py-1 cursor-pointer relative text-white',
        isSelected && 'bg-editor-accent/20',
        isDragging && 'opacity-50',
        isDropTarget && dropPosition === 'inside' && 'bg-editor-accent/10',
        isLocked && 'bg-editor-grid/10',
        'hover:bg-editor-accent/10',
        isLocked && 'cursor-not-allowed'
      )}
      style={{ paddingLeft: `${(level + 1) * 16}px` }}
      onClick={(e) => onSelect(id, e)}
      draggable={!isLocked}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      title={isLocked ? `${type === 'container' ? 'Container' : 'Asset'} is locked - Cannot be moved or modified` : undefined}
    >
      {/* Drop indicators */}
      {isDropTarget && dropPosition === 'before' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-editor-accent" />
      )}
      {isDropTarget && dropPosition === 'after' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-editor-accent" />
      )}
      {isDropTarget && dropPosition === 'inside' && type === 'container' && (
        <div className="absolute inset-0 border-2 border-editor-accent pointer-events-none" />
      )}

      {type === 'container' && hasChildren && (
        <button
          className="p-1 hover:bg-editor-accent/50 rounded text-white"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(id);
          }}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      )}
      {(!hasChildren || type === 'asset') && <div className="w-6" />}
      <button
        className="p-1 hover:bg-editor-accent/50 rounded text-white"
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility(id);
        }}
        title={isVisible ? 'Hide layer' : 'Show layer'}
      >
        {isVisible ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
      </button>
      <button
        className={cn(
          "p-1 hover:bg-editor-accent/50 rounded",
          isLocked ? 'text-editor-accent' : 'text-white'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onToggleLock(id);
        }}
        title={isLocked ? 'Unlock layer' : 'Lock layer'}
      >
        {isLocked ? (
          <Lock className="h-4 w-4" />
        ) : (
          <Unlock className="h-4 w-4" />
        )}
      </button>
      <span className={cn(
        "ml-2",
        type === 'asset' && 'text-white/70 text-sm',
        isLocked && 'text-white/50'
      )}>{name}</span>
    </div>
  );
};

const LayerTree: React.FC<{
  nodes: LayerNode[];
  selectedId: string | null;
  onToggleExpand: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onSelect: (id: string, event: React.MouseEvent) => void;
}> = ({ nodes, selectedId, onToggleExpand, onToggleVisibility, onToggleLock, onSelect }) => {
  const { dragState } = useLayerStore();

  return (
    <>
      {nodes.map((node) => (
        <React.Fragment key={node.id}>
          <LayerItem
            id={node.id}
            name={node.name}
            level={node.level}
            isExpanded={node.isExpanded}
            isVisible={node.isVisible}
            isLocked={node.isLocked}
            isSelected={node.id === selectedId}
            hasChildren={node.children.length > 0}
            isDragging={node.id === dragState.draggingId}
            isDropTarget={node.id === dragState.dropTargetId}
            dropPosition={node.id === dragState.dropTargetId ? dragState.dropPosition : null}
            onToggleExpand={onToggleExpand}
            onToggleVisibility={onToggleVisibility}
            onToggleLock={onToggleLock}
            onSelect={(id, event) => onSelect(id, event)}
            type={node.type}
          />
          {node.isExpanded && node.children.length > 0 && (
            <LayerTree
              nodes={node.children}
              selectedId={selectedId}
              onToggleExpand={onToggleExpand}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
              onSelect={(id, event) => onSelect(id, event)}
            />
          )}
        </React.Fragment>
      ))}
    </>
  );
};

export const LayersPanel: React.FC = () => {
  const {
    getLayerHierarchy,
    selectedId,
    toggleLayerExpansion,
    toggleLayerVisibility,
    selectLayer,
    updateDrag,
    endDrag,
    dragState
  } = useLayerStore();

  const { toggleContainerLock, toggleAssetLock } = useLayoutStore();

  const handleToggleLock = (id: string) => {
    const node = getLayerHierarchy().find(n => n.id === id) || 
                getLayerHierarchy().flatMap(n => n.children).find(n => n.id === id);
    
    if (node) {
      if (node.type === 'container') {
        toggleContainerLock(id);
      } else {
        toggleAssetLock(node.parentId!, id);
      }
    }
  };

  const layers = getLayerHierarchy();

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we're dragging an asset
    const draggedType = e.dataTransfer.getData('text/type');
    
    // Don't allow dropping assets at root level
    if (draggedType === 'asset') {
      e.dataTransfer.dropEffect = 'none';
      updateDrag(null, null);
      return;
    }
    
    // Get the container element
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    
    // If mouse is in the bottom 40% of the panel, show the root drop indicator
    if (mouseY > rect.height * 0.6) {
      updateDrag(null, 'after');
      e.dataTransfer.dropEffect = 'move';
    } else {
      updateDrag(null, null);
    }
  };

  const handleRootDragLeave = (e: React.DragEvent) => {
    // Only reset drag state if we're actually leaving the panel
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { clientX, clientY } = e;
    
    if (
      clientX <= rect.left ||
      clientX >= rect.right ||
      clientY <= rect.top ||
      clientY >= rect.bottom
    ) {
      updateDrag(null, null);
    }
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    endDrag();
  };

  return (
    <div 
      className="w-60 border-r bg-editor-bg text-white relative"
      onDragOver={handleRootDragOver}
      onDragLeave={handleRootDragLeave}
      onDrop={handleRootDrop}
    >
      <div className="p-2 border-b border-editor-grid">
        <h2 className="text-sm font-medium">Layers</h2>
      </div>
      <ScrollArea className="h-[calc(100vh-10rem)]">
        <div className="p-2">
          {layers.length === 0 ? (
            <div className="text-sm text-white/50 p-2 text-center">
              No layers yet. Click "Add Container" to create one.
            </div>
          ) : (
            <>
              <LayerTree
                nodes={layers}
                selectedId={selectedId}
                onToggleExpand={toggleLayerExpansion}
                onToggleVisibility={toggleLayerVisibility}
                onToggleLock={handleToggleLock}
                onSelect={(id, event) => selectLayer(id, event)}
              />
              {/* Root level drop indicator */}
              {dragState.dropTargetId === null && dragState.dropPosition === 'after' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-editor-accent" />
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}; 