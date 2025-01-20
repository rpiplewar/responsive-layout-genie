import { Stage, Layer, Rect, Group, Transformer, Image, Circle } from 'react-konva';
import { useLayoutStore, Container, Asset } from '../store/layoutStore';
import { KonvaEventObject } from 'konva/lib/Node';
import { useEffect, useRef, useMemo } from 'react';
import { devices } from '../config/devices';
import useImage from 'use-image';

// Component to load a single image
const ImageLoader = ({ 
  id, 
  src, 
  onLoad 
}: { 
  id: string; 
  src: string; 
  onLoad: (id: string, image: HTMLImageElement) => void;
}) => {
  const [image] = useImage(src || '');
  
  useEffect(() => {
    if (image) {
      onLoad(id, image);
    }
  }, [id, image, onLoad]);
  
  return null;
};

interface CanvasProps {
  orientation: 'portrait' | 'landscape';
}

const GRID_SIZE = 20;

export const Canvas = ({ orientation }: CanvasProps) => {
  const { 
    containers, 
    selectedId, 
    updateContainer, 
    updateAsset,
    setSelectedId, 
    selectedDevice,
    uploadedImages,
    selectedAssetId
  } = useLayoutStore();
  
  const transformerRef = useRef<any>(null);
  const selectedShapeRef = useRef<any>(null);
  const imageElementsRef = useRef<Record<string, HTMLImageElement>>({});

  const device = devices[selectedDevice];
  const width = orientation === 'portrait' ? device.width : device.height;
  const height = orientation === 'portrait' ? device.height : device.width;

  // Create a map of all images used in containers
  const imageIds = useMemo(() => {
    const ids = new Set<string>();
    containers.forEach(container => {
      Object.values(container.assets).forEach(asset => {
        if (asset.key) {
          ids.add(asset.key);
        }
      });
    });
    return Array.from(ids);
  }, [containers]);

  const handleImageLoad = useMemo(() => {
    return (id: string, image: HTMLImageElement) => {
      imageElementsRef.current[id] = image;
    };
  }, []);

  useEffect(() => {
    if (selectedId && transformerRef.current && selectedShapeRef.current) {
      transformerRef.current.nodes([selectedShapeRef.current]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [selectedId]);

  const handleDragMove = (e: KonvaEventObject<DragEvent>, id: string) => {
    const node = e.target;
    const centerX = node.x() + node.width() / 2;
    const centerY = node.y() + node.height() / 2;
    
    updateContainer(id, {
      x: centerX,
      y: centerY,
    }, orientation);
  };

  const handleTransform = (e: KonvaEventObject<Event>, id: string) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    const newWidth = Math.max(5, node.width() * scaleX);
    const newHeight = Math.max(5, node.height() * scaleY);
    const centerX = node.x() + newWidth / 2;
    const centerY = node.y() + newHeight / 2;

    updateContainer(id, {
      x: centerX,
      y: centerY,
      width: newWidth,
      height: newHeight,
    }, orientation);
  };

  const renderAsset = (containerId: string, asset: Asset) => {
    const container = containers.find(c => c.id === containerId);
    if (!container || !asset.key || !imageElementsRef.current[asset.key]) return null;

    const transform = asset[orientation];
    const containerPos = container[orientation];
    const image = imageElementsRef.current[asset.key];
    
    let originX = containerPos.x - containerPos.width / 2;
    let originY = containerPos.y - containerPos.height / 2;
    
    if (transform.position.reference === 'container') {
      originX += containerPos.width * transform.position.x;
      originY += containerPos.height * transform.position.y;
    } else {
      const refAsset = container.assets[transform.position.reference];
      if (refAsset) {
        const refTransform = refAsset[orientation];
        originX += refTransform.position.x;
        originY += refTransform.position.y;
      }
    }

    let width = transform.size.width * containerPos.width;
    let height = transform.size.height * containerPos.height;

    if (transform.maintainAspectRatio && image) {
      const imageAspectRatio = image.width / image.height;
      const containerAspectRatio = width / height;

      if (transform.scaleMode === 'fit') {
        if (containerAspectRatio > imageAspectRatio) {
          // Container is wider than image
          width = height * imageAspectRatio;
        } else {
          // Container is taller than image
          height = width / imageAspectRatio;
        }
      } else if (transform.scaleMode === 'fill') {
        if (containerAspectRatio > imageAspectRatio) {
          // Container is wider than image
          height = width / imageAspectRatio;
        } else {
          // Container is taller than image
          width = height * imageAspectRatio;
        }
      }
    }

    const isSelected = selectedId === containerId && selectedAssetId === asset.id;

    return (
      <Group key={asset.id}>
        <Image
          image={image}
          x={originX}
          y={originY}
          width={width}
          height={height}
          offsetX={transform.origin.x * width}
          offsetY={transform.origin.y * height}
          rotation={transform.rotation}
          draggable
          onDragMove={(e) => {
            const node = e.target;
            const containerX = containerPos.x - containerPos.width / 2;
            const containerY = containerPos.y - containerPos.height / 2;
            const newX = (node.x() - containerX) / containerPos.width;
            const newY = (node.y() - containerY) / containerPos.height;
            
            const updates = {
              ...transform,
              position: {
                ...transform.position,
                x: newX,
                y: newY
              }
            };
            updateAsset(containerId, asset.id, updates, orientation);
          }}
        />
        {isSelected && (
          <Circle
            x={originX}
            y={originY}
            radius={4}
            fill="red"
            draggable
            onDragMove={(e) => {
              const node = e.target;
              const containerX = containerPos.x - containerPos.width / 2;
              const containerY = containerPos.y - containerPos.height / 2;
              const newX = (node.x() - containerX) / containerPos.width;
              const newY = (node.y() - containerY) / containerPos.height;
              
              const updates = {
                ...transform,
                position: {
                  ...transform.position,
                  x: newX,
                  y: newY
                }
              };
              updateAsset(containerId, asset.id, updates, orientation);
            }}
          />
        )}
      </Group>
    );
  };

  const renderContainer = (container: Container) => {
    const position = container[orientation];
    const x = position.x - position.width / 2;
    const y = position.y - position.height / 2;
    const isSelected = selectedId === container.id;
    const hasParent = !!container.parentId;
    
    return (
      <Group key={container.id}>
        <Rect
          ref={isSelected ? selectedShapeRef : undefined}
          id={container.id}
          x={x}
          y={y}
          width={position.width}
          height={position.height}
          fill={hasParent ? '#bb9af7' : '#7aa2f7'}
          opacity={0.3}
          stroke={isSelected ? '#bb9af7' : (hasParent ? '#bb9af7' : '#7aa2f7')}
          strokeWidth={hasParent ? 2 : 1}
          dash={hasParent ? [5, 5] : undefined}
          draggable
          onClick={(e) => {
            e.cancelBubble = true;
            setSelectedId(container.id);
          }}
          onDragMove={(e) => handleDragMove(e, container.id)}
          onTransform={(e) => handleTransform(e, container.id)}
        />
        <Group onClick={(e) => e.cancelBubble = true}>
          {Object.values(container.assets).map(asset => renderAsset(container.id, asset))}
        </Group>
      </Group>
    );
  };

  return (
    <div className="relative">
      {/* Load all images */}
      {imageIds.map(id => (
        <ImageLoader
          key={id}
          id={id}
          src={uploadedImages[id] || ''}
          onLoad={handleImageLoad}
        />
      ))}
      
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
            {containers.map(renderContainer)}

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
