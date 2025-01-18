import { Stage, Layer, Rect, Group, Transformer } from 'react-konva';
import { useLayoutStore } from '../store/layoutStore';
import { KonvaEventObject } from 'konva/lib/Node';
import { useEffect, useRef } from 'react';
import { devices } from '../config/devices';

interface CanvasProps {
  orientation: 'portrait' | 'landscape';
}

const GRID_SIZE = 20;

export const Canvas = ({ orientation }: CanvasProps) => {
  const { containers, selectedId, updateContainer, setSelectedId, selectedDevice } = useLayoutStore();
  const transformerRef = useRef<any>(null);
  const selectedShapeRef = useRef<any>(null);

  const device = devices[selectedDevice];
  const width = orientation === 'portrait' ? device.width : device.height;
  const height = orientation === 'portrait' ? device.height : device.width;

  useEffect(() => {
    if (selectedId && transformerRef.current && selectedShapeRef.current) {
      transformerRef.current.nodes([selectedShapeRef.current]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [selectedId]);

  const handleDragMove = (e: KonvaEventObject<DragEvent>, id: string) => {
    updateContainer(id, {
      x: e.target.x(),
      y: e.target.y(),
    }, orientation);
  };

  const handleTransform = (e: KonvaEventObject<Event>, id: string) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    updateContainer(id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
    }, orientation);
  };

  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-lg overflow-hidden border-2 border-editor-grid" style={{
        width: width + 44,
        height: height + 88,
        background: '#1a1b26',
        borderRadius: '40px',
      }}>
        <div className="absolute left-1/2 -translate-x-1/2 w-32 h-7 bg-editor-grid rounded-b-2xl" />
        <Stage
          width={width}
          height={height}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white"
        >
          <Layer>
            {/* Grid */}
            <Group>
              {Array.from({ length: Math.ceil(width / GRID_SIZE) }).map((_, i) => (
                <Rect
                  key={`v${i}`}
                  x={i * GRID_SIZE}
                  y={0}
                  width={1}
                  height={height}
                  fill="#2f3146"
                  opacity={0.3}
                />
              ))}
              {Array.from({ length: Math.ceil(height / GRID_SIZE) }).map((_, i) => (
                <Rect
                  key={`h${i}`}
                  x={0}
                  y={i * GRID_SIZE}
                  width={width}
                  height={1}
                  fill="#2f3146"
                  opacity={0.3}
                />
              ))}
            </Group>

            {/* Containers */}
            {containers.map((container) => {
              const position = container[orientation];
              return (
                <Group key={container.id}>
                  <Rect
                    ref={container.id === selectedId ? selectedShapeRef : undefined}
                    id={container.id}
                    x={position.x}
                    y={position.y}
                    width={position.width}
                    height={position.height}
                    fill={selectedId === container.id ? '#bb9af7' : '#7aa2f7'}
                    opacity={0.3}
                    stroke={selectedId === container.id ? '#bb9af7' : '#7aa2f7'}
                    strokeWidth={1}
                    draggable
                    onClick={() => setSelectedId(container.id)}
                    onDragMove={(e) => handleDragMove(e, container.id)}
                    onTransform={(e) => handleTransform(e, container.id)}
                  />
                </Group>
              );
            })}

            {selectedId && (
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  const minSize = 5;
                  if (newBox.width < minSize || newBox.height < minSize) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};