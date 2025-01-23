import { Stage, Layer, Rect, Group, Transformer, Image, Circle } from 'react-konva';
import { useLayoutStore, Container, Asset, AssetTransform } from '../store/layoutStore';
import { KonvaEventObject } from 'konva/lib/Node';
import { useEffect, useRef, useMemo, useState } from 'react';
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
    setSelectedAssetId,
    activeOrientation,
    setActiveOrientation
  } = useLayoutStore();
  
  const transformerRef = useRef<any>(null);
  const selectedShapeRef = useRef<any>(null);
  const selectedAssetRef = useRef<any>(null);
  const imageElementsRef = useRef<Record<string, HTMLImageElement>>({});
  const assetDimensionsRef = useRef<Record<string, { width: number; height: number }>>({});
  const isActiveCanvasRef = useRef(false);
  const stageRef = useRef<any>(null);

  // Track active canvas state for visual feedback
  const [isActive, setIsActive] = useState(activeOrientation === orientation);

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

  // Force re-render when images are loaded
  useEffect(() => {
    const loadedImages = Object.keys(imageElementsRef.current);
    const missingImages = imageIds.filter(id => !loadedImages.includes(id));
    if (missingImages.length > 0) {
      // Force re-render by updating a ref
      imageElementsRef.current = { ...imageElementsRef.current };
    }
  }, [imageIds]);

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

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard events if this orientation is active
      if (!isActiveCanvasRef.current) return;
      if (!selectedId && !selectedAssetId) return;
      
      console.log('Key event:', {
        key: e.key,
        altKey: e.altKey,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        code: e.code,
        orientation,
        isActive: isActiveCanvasRef.current
      });
      
      const step = e.shiftKey ? 10 : 1;
      const isResizing = e.altKey;
      
      if (selectedAssetId) {
        // Find container that has this asset
        const container = containers.find(c => c.assets[selectedAssetId]);
        if (!container) return;
        
        const asset = container.assets[selectedAssetId];
        const transform = asset[orientation];
        let updates: Partial<AssetTransform> = { ...transform };
        
        switch (e.key) {
          case 'ArrowLeft':
            if (isResizing) {
              updates.size = {
                ...transform.size,
                width: Math.max(0.01, transform.size.width - (step * 0.01))
              };
              if (e.shiftKey && transform.maintainAspectRatio) {
                updates.size.height = updates.size.width;
              }
            } else {
              updates.position = {
                ...transform.position,
                x: transform.position.x - (step * 0.01)
              };
            }
            break;
          case 'ArrowRight':
            if (isResizing) {
              updates.size = {
                ...transform.size,
                width: transform.size.width + (step * 0.01)
              };
              if (e.shiftKey && transform.maintainAspectRatio) {
                updates.size.height = updates.size.width;
              }
            } else {
              updates.position = {
                ...transform.position,
                x: transform.position.x + (step * 0.01)
              };
            }
            break;
          case 'ArrowUp':
            if (isResizing) {
              updates.size = {
                ...transform.size,
                height: Math.max(0.01, transform.size.height - (step * 0.01))
              };
              if (e.shiftKey && transform.maintainAspectRatio) {
                updates.size.width = updates.size.height;
              }
            } else {
              updates.position = {
                ...transform.position,
                y: transform.position.y - (step * 0.01)
              };
            }
            break;
          case 'ArrowDown':
            if (isResizing) {
              updates.size = {
                ...transform.size,
                height: transform.size.height + (step * 0.01)
              };
              if (e.shiftKey && transform.maintainAspectRatio) {
                updates.size.width = updates.size.height;
              }
            } else {
              updates.position = {
                ...transform.position,
                y: transform.position.y + (step * 0.01)
              };
            }
            break;
          default:
            return;
        }
        
        e.preventDefault();
        updateAsset(container.id, selectedAssetId, updates, orientation);
      } else if (selectedId) {
        const container = containers.find(c => c.id === selectedId);
        if (!container) return;
        
        const pos = container[orientation];
        let updates: Partial<{ x: number; y: number; width: number; height: number }> = {};
        
        switch (e.key) {
          case 'ArrowLeft':
            if (isResizing) {
              updates = { width: Math.max(5, pos.width - step) };
              if (e.shiftKey) {
                // Maintain aspect ratio
                const ratio = pos.height / pos.width;
                updates.height = Math.max(5, updates.width * ratio);
              }
            } else {
              updates = { x: pos.x - step };
            }
            break;
          case 'ArrowRight':
            if (isResizing) {
              updates = { width: pos.width + step };
              if (e.shiftKey) {
                // Maintain aspect ratio
                const ratio = pos.height / pos.width;
                updates.height = updates.width * ratio;
              }
            } else {
              updates = { x: pos.x + step };
            }
            break;
          case 'ArrowUp':
            if (isResizing) {
              updates = { height: Math.max(5, pos.height - step) };
              if (e.shiftKey) {
                // Maintain aspect ratio
                const ratio = pos.width / pos.height;
                updates.width = Math.max(5, updates.height * ratio);
              }
            } else {
              updates = { y: pos.y - step };
            }
            break;
          case 'ArrowDown':
            if (isResizing) {
              updates = { height: pos.height + step };
              if (e.shiftKey) {
                // Maintain aspect ratio
                const ratio = pos.width / pos.height;
                updates.width = updates.height * ratio;
              }
            } else {
              updates = { y: pos.y + step };
            }
            break;
          default:
            return;
        }
        
        e.preventDefault();
        updateContainer(selectedId, updates, orientation);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, selectedAssetId, containers, orientation, updateContainer, updateAsset, isActive]);

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
    // Skip rendering if isVisible is explicitly false
    if (transform.isVisible === false) return null;
    
    const containerPos = container[orientation];
    const image = imageElementsRef.current[asset.key];

    const calculateAssetDimensions = (assetTransform: AssetTransform, image: HTMLImageElement | null, isContainerRelative: boolean, referenceAssetId?: string): { width: number, height: number } => {
      if (!image) return { width: 0, height: 0 };
      
      let baseWidth: number;
      let baseHeight: number;
      
      if (isContainerRelative) {
        baseWidth = containerPos.width;
        baseHeight = containerPos.height;
      } else if (referenceAssetId && assetDimensionsRef.current[referenceAssetId]) {
        // Use the actual display dimensions of the reference asset
        const refDimensions = assetDimensionsRef.current[referenceAssetId];
        baseWidth = refDimensions.width;
        baseHeight = refDimensions.height;
      } else {
        // Fallback to container dimensions if reference not found
        baseWidth = containerPos.width;
        baseHeight = containerPos.height;
      }
      
      let width = assetTransform.size.width * baseWidth;
      let height = assetTransform.size.height * baseHeight;

      if (assetTransform.maintainAspectRatio) {
        const imageAspectRatio = image.width / image.height;
        const containerAspectRatio = width / height;

        if (assetTransform.scaleMode === 'fit') {
          if (containerAspectRatio > imageAspectRatio) {
            width = height * imageAspectRatio;
          } else {
            height = width / imageAspectRatio;
          }
        } else if (assetTransform.scaleMode === 'fill') {
          if (containerAspectRatio > imageAspectRatio) {
            height = width / imageAspectRatio;
          } else {
            width = height * imageAspectRatio;
          }
        }
      }

      return { width, height };
    };

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

      // Get the reference asset's dimensions from our cache
      const refDimensions = assetDimensionsRef.current[refAsset.id] || { width: containerPos.width, height: containerPos.height };

      return {
        x: refOrigin.x + transform.position.x * refDimensions.width,
        y: refOrigin.y + transform.position.y * refDimensions.height
      };
    };

    const calculateRelativePosition = (node: any, referenceId: string) => {
      const refAsset = container.assets[referenceId];
      if (!refAsset || !refAsset.key || !imageElementsRef.current[refAsset.key]) return null;

      const refTransform = refAsset[orientation];
      const refOrigin = calculateOriginPoint(refAsset.id, refTransform);
      if (!refOrigin) return null;

      // Get the reference asset's dimensions from our cache
      const refDimensions = assetDimensionsRef.current[refAsset.id] || { width: containerPos.width, height: containerPos.height };

      // Use reference asset's actual dimensions for relative positioning
      const newX = (node.x() - refOrigin.x) / refDimensions.width;
      const newY = (node.y() - refOrigin.y) / refDimensions.height;

      return { x: newX, y: newY };
    };

    const isContainerRelative = transform.position.reference === 'container';
    const referenceAssetId = !isContainerRelative ? transform.position.reference : undefined;
    const { width, height } = calculateAssetDimensions(transform, image, isContainerRelative, referenceAssetId);

    // Store the calculated dimensions for other assets to reference
    assetDimensionsRef.current[asset.id] = { width, height };

    const origin = calculateOriginPoint(asset.id, transform);
    if (!origin) return null;

    let originX = origin.x;
    let originY = origin.y;

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
            handleElementClick();
            
            if (selectedId === containerId && selectedAssetId === asset.id) {
              setSelectedId(null);
              setSelectedAssetId(null);
            } else {
              setSelectedId(containerId);
              setSelectedAssetId(asset.id);
            }
          }}
          onDragMove={(e) => {
            handleElementClick();
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
              const newPos = calculateRelativePosition(node, transform.position.reference);
              if (!newPos) return;

              const updates = {
                ...transform,
                position: {
                  ...transform.position,
                  x: newPos.x,
                  y: newPos.y
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
            handleElementClick();
            const node = e.target;
            
            // Get current scale
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();
            
            // Get the reference dimensions
            const isContainerRelative = transform.position.reference === 'container';
            const baseWidth = isContainerRelative ? containerPos.width : (
              assetDimensionsRef.current[transform.position.reference]?.width || containerPos.width
            );
            const baseHeight = isContainerRelative ? containerPos.height : (
              assetDimensionsRef.current[transform.position.reference]?.height || containerPos.height
            );
            
            // Calculate new dimensions relative to reference
            const currentWidth = width;  // Current display width
            const currentHeight = height;  // Current display height
            
            // Convert current size to relative size
            const currentRelativeWidth = currentWidth / baseWidth;
            const currentRelativeHeight = currentHeight / baseHeight;
            
            // Apply scale to relative size
            let newWidth = currentRelativeWidth * scaleX;
            let newHeight = currentRelativeHeight * scaleY;
            
            // If maintaining aspect ratio, adjust the dimensions
            if (transform.maintainAspectRatio && image) {
              const imageAspectRatio = image.width / image.height;
              const newAspectRatio = (newWidth * baseWidth) / (newHeight * baseHeight);
              
              if (transform.scaleMode === 'fit') {
                if (newAspectRatio > imageAspectRatio) {
                  newWidth = newHeight * imageAspectRatio;
                } else {
                  newHeight = newWidth / imageAspectRatio;
                }
              } else if (transform.scaleMode === 'fill') {
                if (newAspectRatio > imageAspectRatio) {
                  newHeight = newWidth / imageAspectRatio;
                } else {
                  newWidth = newHeight * imageAspectRatio;
                }
              }
            }
            
            // Ensure minimum size
            newWidth = Math.max(0.01, newWidth);
            newHeight = Math.max(0.01, newHeight);
            
            // Reset scale since we'll apply it via width/height
            node.scaleX(1);
            node.scaleY(1);
            
            const updates = {
              ...transform,
              size: {
                width: newWidth,
                height: newHeight
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
              handleElementClick();
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
            handleElementClick();
            
            if (selectedId === container.id) {
              setSelectedId(null);
            } else {
              setSelectedId(container.id);
              setSelectedAssetId(null);
            }
          }}
          onDragMove={(e) => {
            handleElementClick();
            handleDragMove(e, container.id);
          }}
          onTransform={(e) => {
            handleElementClick();
            handleTransform(e, container.id);
          }}
        />
        <Group>
          {Object.values(container.assets).map(asset => renderAsset(container.id, asset))}
        </Group>
      </Group>
    );
  };

  // Handle clicks outside any canvas
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if the click is outside both canvases
      const isOutsideCanvas = !target.closest('.canvas-stage');
      
      if (isOutsideCanvas) {
        isActiveCanvasRef.current = false;
        setIsActive(false);
        setActiveOrientation(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setActiveOrientation]);

  // Update active canvas on stage interaction
  const handleStageClick = (e: any) => {
    e.cancelBubble = true;
    
    // Set all canvases as inactive first
    document.querySelectorAll('.canvas-stage').forEach((canvas) => {
      canvas.classList.remove('active-canvas');
    });
    
    // Set this canvas as active and update orientation
    isActiveCanvasRef.current = true;
    setIsActive(true);
    setActiveOrientation(orientation);

    // Only clear selection if clicking on empty stage space
    if (e.target === e.currentTarget) {
      setSelectedId(null);
      setSelectedAssetId(null);
    }
  };

  // Sync active state with global orientation
  useEffect(() => {
    if (activeOrientation === orientation) {
      isActiveCanvasRef.current = true;
      setIsActive(true);
    } else {
      isActiveCanvasRef.current = false;
      setIsActive(false);
    }
  }, [activeOrientation, orientation]);

  // Update active canvas state when clicking on containers or assets
  const handleElementClick = () => {
    // Set all canvases as inactive
    document.querySelectorAll('.canvas-stage').forEach((canvas) => {
      canvas.classList.remove('active-canvas');
    });
    isActiveCanvasRef.current = true;
    setIsActive(true);
    setActiveOrientation(orientation);
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
      
      <div className={`absolute inset-0 rounded-lg overflow-hidden border-2 transition-colors duration-200 ${
        isActive ? 'border-editor-accent' : 'border-editor-grid'
      }`} style={{
        width: width + 44,
        height: height + 88,
        background: '#1a1b26',
        borderRadius: '40px',
      }}>
        <div className="absolute left-1/2 -translate-x-1/2 w-32 h-7 bg-editor-grid rounded-b-2xl" />
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          className="canvas-stage absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white"
          onClick={handleStageClick}
          onTap={handleStageClick}
          onMouseDown={handleStageClick}
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
