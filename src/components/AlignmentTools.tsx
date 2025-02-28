import React from 'react';
import { useAlignmentStore } from '../store/alignmentStore';
import { AlignmentType, AlignmentControls } from '../store/alignmentStore';
import { Position } from '../store/types';

interface AlignmentToolsProps {
  selectedIds: string[];
  onAlign: (alignment: AlignmentControls) => void;
}

export const AlignmentTools: React.FC<AlignmentToolsProps> = ({ selectedIds, onAlign }) => {
  const alignHorizontal = (type: AlignmentType) => {
    onAlign({ horizontal: type });
  };

  const alignVertical = (type: AlignmentType) => {
    onAlign({ vertical: type });
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="flex gap-2 p-2 bg-gray-100 rounded-md">
      {/* Horizontal Alignment */}
      <div className="flex gap-1">
        <button
          onClick={() => alignHorizontal('left')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Align Left"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M1 1v14h2V1H1zm3 2h10v3H4V3zm0 7h6v3H4v-3z" />
          </svg>
        </button>
        <button
          onClick={() => alignHorizontal('center')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Align Center"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M7 1v14h2V1H7zM3 3h10v3H3V3zm2 7h6v3H5v-3z" />
          </svg>
        </button>
        <button
          onClick={() => alignHorizontal('right')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Align Right"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M13 1v14h2V1h-2zM2 3h10v3H2V3zm4 7h6v3H6v-3z" />
          </svg>
        </button>
      </div>

      {/* Vertical Alignment */}
      <div className="flex gap-1">
        <button
          onClick={() => alignVertical('top')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Align Top"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M1 1h14v2H1V1zm2 3v10h3V4H3zm7 0v6h3V4h-3z" />
          </svg>
        </button>
        <button
          onClick={() => alignVertical('middle')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Align Middle"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M1 7h14v2H1V7zM3 3v10h3V3H3zm7 2v6h3V5h-3z" />
          </svg>
        </button>
        <button
          onClick={() => alignVertical('bottom')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Align Bottom"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M1 13h14v2H1v-2zm2-10v10h3V3H3zm7 4v6h3V7h-3z" />
          </svg>
        </button>
      </div>
    </div>
  );
}; 