import { Stage, Layer, Rect, Group } from 'react-konva';
import { useLayoutStore } from '../store/layoutStore';
import { KonvaEventObject } from 'konva/lib/Node';

interface CanvasProps {
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
}

const GRID_SIZE = 20;

export const Canvas = ({ orientation, width, height }: CanvasProps) => {
  const { containers, selectedId, updateContainer, setSelectedId } = useLayoutStore();

  const handleDragMove = (e: KonvaEventObject<DragEvent>, id: string) => {
    updateContainer(id, {
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  const handleTransformEnd = (id: string) => {
    const node = document.getElementById(id);
    if (!node) return;

    const scaleX = node.getAttribute('data-scale-x');
    const scaleY = node.getAttribute('data-scale-y');
    const x = node.getAttribute('data-x');
    const y = node.getAttribute('data-y');

    if (scaleX && scaleY && x && y) {
      updateContainer(id, {
        x: parseFloat(x),
        y: parseFloat(y),
        width: Math.max(5, parseFloat(scaleX)),
        height: Math.max(5, parseFloat(scaleY)),
      });
    }
  };

  return (
    <Stage width={width} height={height} className="bg-editor-bg">
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
        {containers.map((container) => (
          <Group key={container.id}>
            <Rect
              id={container.id}
              x={container.x}
              y={container.y}
              width={container.width}
              height={container.height}
              fill={selectedId === container.id ? '#bb9af7' : '#7aa2f7'}
              opacity={0.3}
              stroke={selectedId === container.id ? '#bb9af7' : '#7aa2f7'}
              strokeWidth={1}
              draggable
              onClick={() => setSelectedId(container.id)}
              onDragMove={(e) => handleDragMove(e, container.id)}
              onTransformEnd={() => handleTransformEnd(container.id)}
            />
          </Group>
        ))}
      </Layer>
    </Stage>
  );
};