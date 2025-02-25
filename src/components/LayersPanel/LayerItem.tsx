import React, { useCallback } from 'react';
import { useLayerStore, LayerNode, DropPosition } from '../../store/layerStore';
import { ChevronRightIcon, EyeIcon, EyeOffIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

interface LayerItemProps {
  node: LayerNode;
  isSelected: boolean;
  onToggleExpand: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onSelect: (id: string, event: React.MouseEvent) => void;
}

export const LayerItem: React.FC<LayerItemProps> = ({
  node,
  isSelected,
  onToggleExpand,
  onToggleVisibility,
  onSelect
}) => {
  const { startDrag, updateDrag, endDrag, dragState } = useLayerStore();

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/type', node.type);
    startDrag(node.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseY = e.clientY;
    const threshold = 5; // pixels from edge to trigger before/after
    const relativeY = mouseY - rect.top;

    // Determine drop position
    let position: DropPosition;
    if (relativeY < threshold) {
      position = 'before';
    } else if (relativeY > rect.height - threshold) {
      position = 'after';
    } else {
      position = node.type === 'container' ? 'inside' : null;
    }

    if (position) {
      updateDrag(node.id, position);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    endDrag();
  };

  const isDragging = dragState.draggingId === node.id;
  const isDropTarget = dragState.dropTargetId === node.id;
  const showTopIndicator = isDropTarget && dragState.dropPosition === 'before';
  const showBottomIndicator = isDropTarget && dragState.dropPosition === 'after';
  const showInsideIndicator = isDropTarget && dragState.dropPosition === 'inside';

  return (
    <div
      className={cn(
        'relative group flex items-center gap-1 px-2 py-1 rounded cursor-pointer select-none',
        isSelected && 'bg-editor-selection',
        isDragging && 'opacity-50',
        showInsideIndicator && 'bg-editor-accent/20'
      )}
      style={{ paddingLeft: `${node.level * 16}px` }}
      onClick={(e) => onSelect(node.id, e)}
      draggable={true}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {showTopIndicator && <div className="absolute top-0 left-0 right-0 h-0.5 bg-editor-accent" />}
      {showBottomIndicator && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-editor-accent" />}
      
      {node.type === 'container' && (
        <button
          className="w-4 h-4 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(node.id);
          }}
        >
          <ChevronRightIcon
            className={cn(
              'w-3 h-3 transition-transform',
              node.isExpanded && 'transform rotate-90'
            )}
          />
        </button>
      )}
      
      <button
        className="w-4 h-4 flex items-center justify-center"
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility(node.id);
        }}
      >
        {node.isVisible ? <EyeIcon className="w-3 h-3" /> : <EyeOffIcon className="w-3 h-3" />}
      </button>
      
      <span className={cn(
        'flex-1 truncate text-sm',
        node.type === 'asset' && 'text-white/70 text-xs',
        !node.isVisible && 'text-white/50'
      )}>
        {node.name}
      </span>
    </div>
  );
}; 