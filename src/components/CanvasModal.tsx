import { Canvas } from './Canvas';
import { X, Minus, Plus, Move } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';

interface CanvasModalProps {
  orientation: 'portrait' | 'landscape';
  onClose: () => void;
}

export const CanvasModal = ({ orientation, onClose }: CanvasModalProps) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.1));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && e.altKey) { // Left click + Alt for panning
      setIsDragging(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.01;
      const newZoom = Math.max(0.1, Math.min(5, zoom + delta));
      setZoom(newZoom);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-editor-bg rounded-lg p-4 w-[95vw] h-[95vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
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
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Move className="h-4 w-4" />
              Hold Alt + Left Click to pan
            </div>
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
        
        <div 
          ref={containerRef}
          className="flex-1 relative bg-editor-grid/10"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <div className="absolute w-full h-full">
            <Canvas 
              orientation={orientation} 
              isInfinite={true} 
              transform={{
                x: pan.x,
                y: pan.y,
                scale: zoom
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 