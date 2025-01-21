import { Canvas } from './Canvas';
import { X, Minus, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';

interface CanvasModalProps {
  orientation: 'portrait' | 'landscape';
  onClose: () => void;
}

export const CanvasModal = ({ orientation, onClose }: CanvasModalProps) => {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-editor-bg rounded-lg p-4 w-[95vw] h-[95vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="inline-flex items-center rounded-lg border border-editor-grid bg-editor-grid">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              className="rounded-none border-r border-editor-grid hover:bg-editor-accent/20"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm text-white">{Math.round(zoom * 100)}%</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              className="rounded-none border-l border-editor-grid hover:bg-editor-accent/20"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-auto relative bg-editor-grid/10">
          <div 
            className="absolute w-[200%] h-[200%] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              minWidth: '200%',
              minHeight: '200%',
            }}
          >
            <div 
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center',
                transition: 'transform 0.1s ease'
              }}
            >
              <Canvas orientation={orientation} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 