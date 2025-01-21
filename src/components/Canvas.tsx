import { Stage, Layer, Rect, Group, Transformer, Image, Circle } from 'react-konva';
import { useLayoutStore, Container, Asset, AssetTransform } from '../store/layoutStore';
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
    selectedAssetId,
    setSelectedAssetId
  } = useLayoutStore();
  
  const transformerRef = useRef<any>(null);
  const selectedShapeRef = useRef<any>(null);
  const selectedAssetRef = useRef<any>(null);
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
    if (transformerRef.current) {
      if (selectedId && selectedShapeRef.current) {
        transformerRef.current.nodes([selectedShapeRef.current]);
        transformerRef.current.getLayer().batchDraw();
      } else if (selectedAssetId && selectedAssetRef.current) {
        transformerRef.current.nodes([selectedAssetRef.current]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId, selectedAssetId]);

  const handleDragMove = (e: KonvaEventObject<DragEvent>, id: string) => {
    const node = e.target;
    const centerX = node.x() + node.width() / 2;
    const centerY = node.y() + node.height() / 2;
    
    const container = containers.find(c => c.id === id);
    if (!container) return;
    
    const oldPos = container[orientation];
    const deltaX = centerX - oldPos.x;
    const deltaY = centerY - oldPos.y;
    
    updateContainer(id, {
      x: centerX,
      y: centerY,
    }, orientation);

    // Update child containers recursively
    const updateDependentContainers = (parentId: string) => {
      containers.forEach(childContainer => {
        if (childContainer.parentId === parentId) {
          // Move child by the same delta as parent
          const childPos = childContainer[orientation];
          updateContainer(childContainer.id, {
            x: childPos.x + deltaX,
            y: childPos.y + deltaY,
          }, orientation);

          // Update all assets in this container
          Object.entries(childContainer.assets).forEach(([assetId, asset]) => {
            updateAsset(childContainer.id, assetId, asset[orientation], orientation);
          });

          // Recursively update this container's children
          updateDependentContainers(childContainer.id);
        }
      });
    };

    // Start the cascade of updates from the dragged container
    updateDependentContainers(id);
  };

  const handleTransform = (e: KonvaEventObject<Event>, id: string) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    const container = containers.find(c => c.id === id);
    if (!container) return;

    const oldPos = container[orientation];
    const newWidth = Math.max(5, node.width() * scaleX);
    const newHeight = Math.max(5, node.height() * scaleY);
    const centerX = node.x() + newWidth / 2;
    const centerY = node.y() + newHeight / 2;

    const scaleChangeX = newWidth / oldPos.width;
    const scaleChangeY = newHeight / oldPos.height;
    const deltaX = centerX - oldPos.x;
    const deltaY = centerY - oldPos.y;

    updateContainer(id, {
      x: centerX,
      y: centerY,
      width: newWidth,
      height: newHeight,
    }, orientation);

    // Update child containers recursively
    const updateDependentContainers = (parentId: string) => {
      containers.forEach(childContainer => {
        if (childContainer.parentId === parentId) {
          const childPos = childContainer[orientation];
          
          // Scale child container relative to parent's scale change
          const newChildWidth = childPos.width * scaleChangeX;
          const newChildHeight = childPos.height * scaleChangeY;
          
          // Move child by the same delta as parent
          updateContainer(childContainer.id, {
            x: childPos.x + deltaX,
            y: childPos.y + deltaY,
            width: newChildWidth,
            height: newChildHeight,
          }, orientation);

          // Update all assets in this container
          Object.entries(childContainer.assets).forEach(([assetId, asset]) => {
            updateAsset(childContainer.id, assetId, asset[orientation], orientation);
          });

          // Recursively update this container's children
          updateDependentContainers(childContainer.id);
        }
      });
    };

    // Start the cascade of updates from the transformed container
    updateDependentContainers(id);
  };

  const renderAsset = (containerId: string, asset: Asset) => {
    const container = containers.find(c => c.id === containerId);
    if (!container || !asset.key || !imageElementsRef.current[asset.key]) return null;

    const transform = asset[orientation];
    const containerPos = container[orientation];
    const image = imageElementsRef.current[asset.key];

    // Helper function to recursively calculate origin point
    const calculateOriginPoint = (assetId: string, transform: AssetTransform): { x: number, y: number } | null => {
      if (transform.position.reference === 'container') {
        return {
          x: containerPos.x + transform.position.x * containerPos.width,
          y: containerPos.y + transform.position.y * containerPos.height
        };
      }

      const refAsset = container.assets[transform.position.reference];
      if (!refAsset || !refAsset.key || !imageElementsRef.current[refAsset.key]) return null;

      const refTransform = refAsset[orientation];
      const refOrigin = calculateOriginPoint(refAsset.id, refTransform);
      if (!refOrigin) return null;

      return {
        x: refOrigin.x + transform.position.x * containerPos.width,
        y: refOrigin.y + transform.position.y * containerPos.height
      };
    };

    const origin = calculateOriginPoint(asset.id, transform);
    if (!origin) return null;

    let originX = origin.x;
    let originY = origin.y;

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
          ref={isSelected ? selectedAssetRef : undefined}
          image={image}
          x={originX}
          y={originY}
          width={width}
          height={height}
          offsetX={transform.origin.x * width}
          offsetY={transform.origin.y * height}
          rotation={transform.rotation}
          draggable
          transformable={true}
          onClick={(e) => {
            e.cancelBubble = true;
            if (selectedId === containerId && selectedAssetId === asset.id) {
              setSelectedId(null);
              setSelectedAssetId(null);
            } else {
              setSelectedId(containerId);
              setSelectedAssetId(asset.id);
            }
          }}
          onDragMove={(e) => {
            const node = e.target;
            
            if (transform.position.reference === 'container') {
              const newX = (node.x() - containerPos.x) / containerPos.width;
              const newY = (node.y() - containerPos.y) / containerPos.height;
              
              const updates = {
                ...transform,
                position: {
                  ...transform.position,
                  x: newX,
                  y: newY
                }
              };
              updateAsset(containerId, asset.id, updates, orientation);
            } else {
              const refAsset = container.assets[transform.position.reference];
              if (!refAsset) return;

              const refOrigin = calculateOriginPoint(refAsset.id, refAsset[orientation]);
              if (!refOrigin) return;

              const newX = (node.x() - refOrigin.x) / containerPos.width;
              const newY = (node.y() - refOrigin.y) / containerPos.height;

              const updates = {
                ...transform,
                position: {
                  ...transform.position,
                  x: newX,
                  y: newY
                }
              };
              updateAsset(containerId, asset.id, updates, orientation);
            }

            // Update all assets that reference this one
            const updateDependentAssets = (assetId: string) => {
              Object.entries(container.assets).forEach(([id, dependentAsset]) => {
                if (dependentAsset[orientation].position.reference === assetId) {
                  const origin = calculateOriginPoint(id, dependentAsset[orientation]);
                  if (!origin) return;

                  // Keep the same relative position but update based on new reference position
                  updateAsset(containerId, id, dependentAsset[orientation], orientation);
                  
                  // Recursively update assets that reference this dependent asset
                  updateDependentAssets(id);
                }
              });
            };

            // Start the cascade of updates from the dragged asset
            updateDependentAssets(asset.id);
          }}
          onTransform={(e) => {
            const node = e.target;
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();
            
            // Reset scale since we'll apply it via width/height
            node.scaleX(1);
            node.scaleY(1);
            
            let newWidth = Math.max(5, node.width() * scaleX);
            let newHeight = Math.max(5, node.height() * scaleY);
            
            // If maintaining aspect ratio, adjust the dimensions
            if (transform.maintainAspectRatio && image) {
              const imageAspectRatio = image.width / image.height;
              const newAspectRatio = newWidth / newHeight;
              
              if (transform.scaleMode === 'fit') {
                if (newAspectRatio > imageAspectRatio) {
                  // Width is too large
                  newWidth = newHeight * imageAspectRatio;
                } else {
                  // Height is too large
                  newHeight = newWidth / imageAspectRatio;
                }
              } else if (transform.scaleMode === 'fill') {
                if (newAspectRatio > imageAspectRatio) {
                  // Height is too small
                  newHeight = newWidth / imageAspectRatio;
                } else {
                  // Width is too small
                  newWidth = newHeight * imageAspectRatio;
                }
              }
            }
            
            const updates = {
              ...transform,
              size: {
                width: newWidth / containerPos.width,
                height: newHeight / containerPos.height,
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
              
              if (transform.position.reference === 'container') {
                const newX = (node.x() - containerPos.x) / containerPos.width;
                const newY = (node.y() - containerPos.y) / containerPos.height;
                
                const updates = {
                  ...transform,
                  position: {
                    ...transform.position,
                    x: newX,
                    y: newY
                  }
                };
                updateAsset(containerId, asset.id, updates, orientation);
              } else {
                const refAsset = container.assets[transform.position.reference];
                if (!refAsset) return;

                const refOrigin = calculateOriginPoint(refAsset.id, refAsset[orientation]);
                if (!refOrigin) return;

                const newX = (node.x() - refOrigin.x) / containerPos.width;
                const newY = (node.y() - refOrigin.y) / containerPos.height;

                const updates = {
                  ...transform,
                  position: {
                    ...transform.position,
                    x: newX,
                    y: newY
                  }
                };
                updateAsset(containerId, asset.id, updates, orientation);
              }
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
    const isSelected = selectedId === container.id && !selectedAssetId;
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
            if (selectedId === container.id) {
              setSelectedId(null);
            } else {
              setSelectedId(container.id);
              setSelectedAssetId(null);
            }
          }}
          onDragMove={(e) => handleDragMove(e, container.id)}
          onTransform={(e) => handleTransform(e, container.id)}
        />
        <Group>
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

            {/* Transformer - will be used for both containers and assets */}
            {(selectedId || selectedAssetId) && (
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  const minSize = 5;
                  if (newBox.width < minSize || newBox.height < minSize) {
                    return oldBox;
                  }
                  return newBox;
                }}
                keepRatio={selectedAssetId ? containers.find(c => c.id === selectedId)?.assets[selectedAssetId]?.[orientation].maintainAspectRatio : false}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};
