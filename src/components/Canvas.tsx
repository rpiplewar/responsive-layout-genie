import { Stage, Layer, Rect, Group, Transformer, Image, Circle, Line } from 'react-konva';
import { useLayoutStore, Container, Asset, AssetTransform } from '../store/layoutStore';
import { useAlignmentStore, AlignmentControls } from '../store/alignmentStore';
import { Position, Size } from '../store/types';
import { AlignmentGuides } from './AlignmentGuides';
import { AlignmentTools } from './AlignmentTools';
import { calculateAlignedPosition, calculateAlignmentGuides } from '../lib/alignment';
import { KonvaEventObject } from 'konva/lib/Node';
import { useEffect, useRef, useMemo, useState } from 'react';
import { devices } from '../config/devices';
import useImage from 'use-image';
import Konva from 'konva';

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
  isInfinite?: boolean;
  transform?: {
    x: number;
    y: number;
    scale: number;
  };
}

const GRID_SIZE = 20;

interface DeviceFrame {
  id: 'device-frame';
  position: Position;
  size: Size;
}

interface AlignmentReference {
  id: string;
  position: Position;
  size: Size;
}

export const Canvas = ({ orientation, isInfinite, transform }: CanvasProps) => {
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
    setActiveOrientation,
    getAbsoluteDepth
  } = useLayoutStore();
  
  const { guides, setGuides, clearGuides } = useAlignmentStore();
  const [isDragging, setIsDragging] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedShapeRef = useRef<Konva.Rect>(null);
  const selectedAssetRef = useRef<Konva.Image>(null);
  const imageElementsRef = useRef<Record<string, HTMLImageElement>>({});
  const assetDimensionsRef = useRef<Record<string, { width: number; height: number }>>({});
  const isActiveCanvasRef = useRef(false);
  const stageRef = useRef<Konva.Stage>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  // Track active canvas state for visual feedback
  const [isActive, setIsActive] = useState(activeOrientation === orientation);

  const device = devices[selectedDevice];
  const width = orientation === 'portrait' ? device.width : device.height;
  const height = orientation === 'portrait' ? device.height : device.width;

  // Track container dimensions with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        console.log('[INFINITE_CANVAS] Container resized:', { width, height });
        setContainerDimensions({ width, height });
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate stage dimensions based on container size or device size
  const [stageWidth, setStageWidth] = useState(width);
  const [stageHeight, setStageHeight] = useState(height);

  // Calculate center coordinates and device frame reference
  const { centerX, centerY, deviceFrameRef } = useMemo(() => {
    const cx = isInfinite ? (stageWidth - width) / 2 : 0;
    const cy = isInfinite ? (stageHeight - height) / 2 : 0;
    
    return {
      centerX: cx,
      centerY: cy,
      deviceFrameRef: {
        id: 'device-frame',
        position: {
          x: isInfinite ? cx : width/2,
          y: isInfinite ? cy : height/2
        },
        size: {
          width: width,
          height: height
        }
      } as AlignmentReference
    };
  }, [isInfinite, stageWidth, stageHeight, width, height]);

  useEffect(() => {
    if (isInfinite && containerDimensions.width > 0 && containerDimensions.height > 0) {
      const newStageWidth = Math.max(containerDimensions.width * 1.5, width * 2);
      const newStageHeight = Math.max(containerDimensions.height * 1.5, height * 2);
      setStageWidth(newStageWidth);
      setStageHeight(newStageHeight);
    } else if (!isInfinite) {
      setStageWidth(width);
      setStageHeight(height);
    }
  }, [isInfinite, width, height, containerDimensions]);

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
        const updates: Partial<AssetTransform> = { ...transform };
        
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

  // Update drag move to include device frame in guides for root containers
  const handleDragMove = (e: KonvaEventObject<DragEvent>, id: string) => {
    const node = e.target;
    const element = containers.find(c => c.id === id);
    if (!element) return;

    // Get other elements to check for alignment
    const otherElements: AlignmentReference[] = containers
      .filter(c => c.id !== id)
      .map(c => ({
        id: c.id,
        position: c[orientation],
        size: { width: c[orientation].width, height: c[orientation].height }
      }));
    
    // If this is a root container, add device frame as a reference
    if (!element.parentId) {
      otherElements.push(deviceFrameRef);
    }

    // Calculate alignment guides including device frame
    const movingRef: AlignmentReference = {
      id,
      position: { x: node.x(), y: node.y() },
      size: { width: node.width(), height: node.height() }
    };

    const newGuides = calculateAlignmentGuides(movingRef, otherElements, 5);
    setGuides(newGuides);

    const centerX = node.x() + node.width() / 2;
    const centerY = node.y() + node.height() / 2;
    
    const oldPos = element[orientation];
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
          
          // Only update position, preserve original size
          updateContainer(childContainer.id, {
            x: childPos.x + deltaX,
            y: childPos.y + deltaY,
          }, orientation);

          // Update all assets in this container
          Object.entries(childContainer.assets).forEach(([assetId, asset]) => {
            const assetTransform = asset[orientation];
            if (assetTransform.position.reference === 'container') {
              // Only update container-relative assets' positions
              const assetUpdates = {
                ...assetTransform,
                position: {
                  ...assetTransform.position,
                  x: assetTransform.position.x,
                  y: assetTransform.position.y
                }
              };
              updateAsset(childContainer.id, assetId, assetUpdates, orientation);
            }
          });

          // Recursively update this container's children
          updateDependentContainers(childContainer.id);
        }
      });
    };

    // Start the cascade of updates from the transformed container
    updateDependentContainers(id);
  };

  // Move calculateOriginPoint outside renderAsset
  const calculateOriginPoint = (containerId: string, assetId: string, transform: AssetTransform): { x: number, y: number } | null => {
    const container = containers.find(c => c.id === containerId);
    if (!container) return null;
    
    const containerPos = container[orientation];
    
    if (transform.position.reference === 'container') {
      // For container reference, position is relative to container center
      return {
        x: containerPos.x + transform.position.x * containerPos.width,
        y: containerPos.y + transform.position.y * containerPos.height
      };
    }

    const refAsset = container.assets[transform.position.reference];
    if (!refAsset || !refAsset.key || !imageElementsRef.current[refAsset.key]) return null;

    const refTransform = refAsset[orientation];
    const refOrigin = calculateOriginPoint(containerId, refAsset.id, refTransform);
    if (!refOrigin) return null;

    // Get the reference asset's dimensions from our cache
    const refDimensions = assetDimensionsRef.current[refAsset.id] || { width: containerPos.width, height: containerPos.height };

    return {
      x: refOrigin.x + transform.position.x * refDimensions.width,
      y: refOrigin.y + transform.position.y * refDimensions.height
    };
  };

  // Sort containers by depth before rendering
  const sortedContainers = useMemo(() => {
    return [...containers].sort((a, b) => {
      const aDepth = getAbsoluteDepth(a.id);
      const bDepth = getAbsoluteDepth(b.id);
      return aDepth - bDepth; // Lower depth renders first
    });
  }, [containers, getAbsoluteDepth]);

  // Sort assets by container
  const getContainerSortedAssets = (container: Container) => {
    return Object.values(container.assets).sort((a, b) => {
      const aDepth = getAbsoluteDepth(container.id, a.id);
      const bDepth = getAbsoluteDepth(container.id, b.id);
      return aDepth - bDepth; // Lower depth renders first
    });
  };

  const renderContainer = (container: Container) => {
    const position = container[orientation];
    const x = position.x - position.width / 2;
    const y = position.y - position.height / 2;
    const isSelected = selectedId === container.id && !selectedAssetId;
    const hasParent = !!container.parentId;
    const isLocked = container.isLocked;
    
    // Get sorted assets for this container
    const sortedAssets = getContainerSortedAssets(container);
    
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
          draggable={!isLocked}
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
          onDragStart={() => {
            if (isLocked) return;
            setIsDragging(true);
          }}
          onDragMove={(e) => {
            if (isLocked) return;
            handleElementClick();
            handleDragMove(e, container.id);
          }}
          onDragEnd={() => {
            if (isLocked) return;
            setIsDragging(false);
            clearGuides();
          }}
          onTransform={(e) => {
            if (isLocked) return;
            handleElementClick();
            handleTransform(e, container.id);
          }}
        />
        <Group>
          {sortedAssets.map(asset => renderAsset(container.id, asset))}
        </Group>
      </Group>
    );
  };

  const renderAsset = (containerId: string, asset: Asset) => {
    const container = containers.find(c => c.id === containerId);
    if (!container || !asset.key || !imageElementsRef.current[asset.key]) return null;

    const transform = asset[orientation];
    // Skip rendering if isVisible is explicitly false
    if (transform.isVisible === false) return null;
    
    const containerPos = container[orientation];
    const image = imageElementsRef.current[asset.key];
    const isLocked = asset.isLocked || container.isLocked; // Asset is locked if either it or its container is locked

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

    const calculateRelativePosition = (node: Konva.Node, referenceId: string) => {
      const refAsset = container.assets[referenceId];
      if (!refAsset || !refAsset.key || !imageElementsRef.current[refAsset.key]) return null;

      const refTransform = refAsset[orientation];
      const refOrigin = calculateOriginPoint(containerId, refAsset.id, refTransform);
      if (!refOrigin) return null;

      // Get the reference asset's dimensions
      const refDimensions = assetDimensionsRef.current[refAsset.id] || { width: containerPos.width, height: containerPos.height };

      // Calculate position relative to reference asset's center
      const newX = (node.x() - refOrigin.x) / refDimensions.width;
      const newY = (node.y() - refOrigin.y) / refDimensions.height;

      return { x: newX, y: newY };
    };

    const isContainerRelative = transform.position.reference === 'container';
    const referenceAssetId = !isContainerRelative ? transform.position.reference : undefined;
    const { width, height } = calculateAssetDimensions(transform, image, isContainerRelative, referenceAssetId);

    // Store the calculated dimensions for other assets to reference
    assetDimensionsRef.current[asset.id] = { width, height };

    const origin = calculateOriginPoint(containerId, asset.id, transform);
    if (!origin) return null;

    const originX = origin.x;
    const originY = origin.y;

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
          offsetX={width * transform.origin.x}
          offsetY={height * transform.origin.y}
          rotation={transform.rotation}
          draggable={!isLocked}
          transformable={!isLocked}
          onClick={(e) => {
            e.cancelBubble = true;
            handleElementClick();
            
            // Store the current position before selection
            const node = e.target;
            const currentX = node.x();
            const currentY = node.y();
            
            if (selectedId === containerId && selectedAssetId === asset.id) {
              setSelectedId(null);
              setSelectedAssetId(null);
            } else {
              setSelectedId(containerId);
              setSelectedAssetId(asset.id);
            }
            
            // Restore position after selection
            node.x(currentX);
            node.y(currentY);
          }}
          onDragStart={(e) => {
            if (isLocked) return;
            setIsDragging(true);
            // Store initial position in ref
            const node = e.target;
            lastPositionRef.current = {
              x: node.x(),
              y: node.y()
            };
          }}
          onDragMove={(e) => {
            if (isLocked) return;
            handleElementClick();
            const node = e.target;
            
            if (transform.position.reference === 'container') {
              // Match the coordinate system used in calculateOriginPoint
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
              if (!newPos && lastPositionRef.current) {
                // If calculation fails, restore last good position
                node.x(lastPositionRef.current.x);
                node.y(lastPositionRef.current.y);
                return;
              }

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

            // Store last good position
            lastPositionRef.current = {
              x: node.x(),
              y: node.y()
            };

            // Update dependent assets
            const updateDependentAssets = (assetId: string) => {
              Object.entries(container.assets).forEach(([id, dependentAsset]) => {
                if (dependentAsset[orientation].position.reference === assetId) {
                  updateAsset(selectedId, id, dependentAsset[orientation], orientation);
                  updateDependentAssets(id);
                }
              });
            };
            updateDependentAssets(asset.id);
          }}
          onTransform={(e) => {
            if (isLocked) return;
            handleElementClick();
            const node = e.target;
            
            // Get current scale and position before any resets
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();
            const currentAbsX = node.x();
            const currentAbsY = node.y();
            
            // Get the reference dimensions
            const isContainerRelative = transform.position.reference === 'container';
            const baseWidth = isContainerRelative ? containerPos.width : (
              assetDimensionsRef.current[transform.position.reference]?.width || containerPos.width
            );
            const baseHeight = isContainerRelative ? containerPos.height : (
              assetDimensionsRef.current[transform.position.reference]?.height || containerPos.height
            );
            
            // Calculate new absolute dimensions
            let newAbsWidth = node.width() * scaleX;
            let newAbsHeight = node.height() * scaleY;
            
            // If maintaining aspect ratio, adjust dimensions
            if (transform.maintainAspectRatio && image) {
              const imageAspectRatio = image.width / image.height;
              const newAspectRatio = newAbsWidth / newAbsHeight;
              
              if (transform.scaleMode === 'fit') {
                if (newAspectRatio > imageAspectRatio) {
                  newAbsWidth = newAbsHeight * imageAspectRatio;
                } else {
                  newAbsHeight = newAbsWidth / imageAspectRatio;
                }
              } else if (transform.scaleMode === 'fill') {
                if (newAspectRatio > imageAspectRatio) {
                  newAbsHeight = newAbsWidth / imageAspectRatio;
                } else {
                  newAbsWidth = newAbsHeight * imageAspectRatio;
                }
              }
            }
            
            // Convert to relative sizes
            const newWidth = Math.max(0.01, newAbsWidth / baseWidth);
            const newHeight = Math.max(0.01, newAbsHeight / baseHeight);
            
            // Create the update with new dimensions
            const updates = {
              ...transform,
              size: {
                width: newWidth,
                height: newHeight
              }
            };
            
            // Reset scale AFTER calculating new dimensions
            node.scaleX(1);
            node.scaleY(1);
            
            // Restore absolute position to prevent jumping
            node.x(currentAbsX);
            node.y(currentAbsY);
            
            // Apply the update
            updateAsset(containerId, asset.id, updates, orientation);
          }}
          onDragEnd={() => {
            if (isLocked) return;
            setIsDragging(false);
            clearGuides();
          }}
        />
        {isSelected && !isLocked && (
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

                const refOrigin = calculateOriginPoint(containerId, refAsset.id, refAsset[orientation]);
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
  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    console.log('[INFINITE_CANVAS] Stage click:', {
      target: e.target,
      currentTarget: e.currentTarget,
      targetType: e.target.getType(),
      targetName: e.target.name(),
    });
    
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

  useEffect(() => {
    if (transform) {
      console.log('[INFINITE_CANVAS] Transform updated:', transform);
    }
  }, [transform]);

  useEffect(() => {
    console.log('[INFINITE_CANVAS] Dimensions:', {
      deviceWidth: width,
      deviceHeight: height,
      stageWidth,
      stageHeight,
      containerWidth: containerRef?.current?.offsetWidth,
      containerHeight: containerRef?.current?.offsetHeight,
      isInfinite
    });
  }, [width, height, stageWidth, stageHeight, isInfinite]);

  // Add guide clearing on drag end
  const handleDragEnd = () => {
    clearGuides();
  };

  // Update handleAlign to strictly handle single-axis updates
  const handleAlign = (alignment: AlignmentControls) => {
    // Handle asset alignment
    if (selectedAssetId && selectedId) {
      const container = containers.find(c => c.id === selectedId);
      if (!container) return;

      const asset = container.assets[selectedAssetId];
      if (!asset) return;

      const transform = asset[orientation];
      const containerPos = container[orientation];

      // Keep current positions
      const currentX = transform.position.x;
      const currentY = transform.position.y;
      let newX = currentX;
      let newY = currentY;

      if (transform.position.reference === 'container') {
        // Handle container-relative positioning with origin offset
        if (alignment.horizontal) {
          switch (alignment.horizontal) {
            case 'left':
              newX = -0.5; // Left edge of container
              break;
            case 'center':
              newX = 0; // Center of container
              break;
            case 'right':
              newX = 0.5; // Right edge of container
              break;
          }
        } else if (alignment.vertical) {
          switch (alignment.vertical) {
            case 'top':
              newY = -0.5; // Top edge of container
              break;
            case 'middle':
              newY = 0; // Middle of container
              break;
            case 'bottom':
              newY = 0.5; // Bottom edge of container
              break;
          }
        }
      } else {
        // Handle asset-relative positioning with origin offset
        const refAsset = container.assets[transform.position.reference];
        if (!refAsset) return;

        if (alignment.horizontal) {
          switch (alignment.horizontal) {
            case 'left':
              newX = -0.5; // Left edge of reference asset
              break;
            case 'center':
              newX = 0; // Center of reference asset
              break;
            case 'right':
              newX = 0.5; // Right edge of reference asset
              break;
          }
        } else if (alignment.vertical) {
          switch (alignment.vertical) {
            case 'top':
              newY = -0.5; // Top edge of reference asset
              break;
            case 'middle':
              newY = 0; // Middle of reference asset
              break;
            case 'bottom':
              newY = 0.5; // Bottom edge of reference asset
              break;
          }
        }
      }

      // Only update the position that changed
      const updates = {
        ...transform,
        position: {
          ...transform.position,
          x: alignment.horizontal ? newX : currentX,
          y: alignment.vertical ? newY : currentY
        }
      };

      // Update the asset position
      updateAsset(selectedId, selectedAssetId, updates, orientation);

      // Update dependent assets
      const updateDependentAssets = (assetId: string) => {
        Object.entries(container.assets).forEach(([id, dependentAsset]) => {
          if (dependentAsset[orientation].position.reference === assetId) {
            updateAsset(selectedId, id, dependentAsset[orientation], orientation);
            updateDependentAssets(id);
          }
        });
      };

      updateDependentAssets(selectedAssetId);
      return;
    }

    // Handle container alignment
    if (!selectedId) return;

    const element = containers.find(c => c.id === selectedId);
    if (!element) return;

    const parent = element.parentId ? containers.find(c => c.id === element.parentId) : null;
    const oldPos = element[orientation];

    // If no parent, align to device frame
    if (!parent) {
      const elementRef: AlignmentReference = {
        id: element.id,
        position: element[orientation],
        size: { width: element[orientation].width, height: element[orientation].height }
      };

      const newPosition = calculateAlignedPosition(elementRef, deviceFrameRef, alignment);
      
      // Calculate deltas only for the changed axis
      const deltaX = newPosition.x !== undefined ? newPosition.x - oldPos.x : 0;
      const deltaY = newPosition.y !== undefined ? newPosition.y - oldPos.y : 0;
      
      // Update container with only the changed coordinates
      const updates: Partial<Position> = {
        ...oldPos,  // Preserve existing position
        ...(newPosition.x !== undefined ? { x: newPosition.x } : {}),
        ...(newPosition.y !== undefined ? { y: newPosition.y } : {})
      };
      
      updateContainer(selectedId, updates, orientation);

      // Update dependent containers recursively
      const updateDependentContainers = (parentId: string) => {
        containers.forEach(childContainer => {
          if (childContainer.parentId === parentId) {
            const childPos = childContainer[orientation];
            const childUpdates: Partial<Position> = {
              ...childPos,  // Preserve existing position
              ...(deltaX !== 0 ? { x: childPos.x + deltaX } : {}),
              ...(deltaY !== 0 ? { y: childPos.y + deltaY } : {})
            };
            
            updateContainer(childContainer.id, childUpdates, orientation);

            // Update all assets in this container
            Object.entries(childContainer.assets).forEach(([assetId, asset]) => {
              const assetTransform = asset[orientation];
              if (assetTransform.position.reference === 'container') {
                // Only update container-relative assets for the changed axis
                const assetUpdates = {
                  ...assetTransform,
                  position: {
                    ...assetTransform.position,
                    ...(deltaX !== 0 ? { x: assetTransform.position.x } : {}),
                    ...(deltaY !== 0 ? { y: assetTransform.position.y } : {})
                  }
                };
                updateAsset(selectedId, assetId, assetUpdates, orientation);
              }
            });

            updateDependentContainers(childContainer.id);
          }
        });
      };

      updateDependentContainers(selectedId);
      return;
    }

    // Handle alignment to parent container
    const elementRef: AlignmentReference = {
      id: element.id,
      position: element[orientation],
      size: { width: element[orientation].width, height: element[orientation].height }
    };

    const parentRef: AlignmentReference = {
      id: parent.id,
      position: parent[orientation],
      size: { width: parent[orientation].width, height: parent[orientation].height }
    };

    const newPosition = calculateAlignedPosition(elementRef, parentRef, alignment);
    
    // Calculate deltas only for the changed axis
    const deltaX = newPosition.x !== undefined ? newPosition.x - oldPos.x : 0;
    const deltaY = newPosition.y !== undefined ? newPosition.y - oldPos.y : 0;
    
    // Update container with only the changed coordinates
    const updates: Partial<Position> = {
      ...oldPos,  // Preserve existing position
      ...(newPosition.x !== undefined ? { x: newPosition.x } : {}),
      ...(newPosition.y !== undefined ? { y: newPosition.y } : {})
    };
    
    updateContainer(selectedId, updates, orientation);

    // Update dependent containers recursively
    const updateDependentContainers = (parentId: string) => {
      containers.forEach(childContainer => {
        if (childContainer.parentId === parentId) {
          const childPos = childContainer[orientation];
          const childUpdates: Partial<Position> = {
            ...childPos,  // Preserve existing position
            ...(deltaX !== 0 ? { x: childPos.x + deltaX } : {}),
            ...(deltaY !== 0 ? { y: childPos.y + deltaY } : {})
          };
          
          updateContainer(childContainer.id, childUpdates, orientation);

          // Update all assets in this container
          Object.entries(childContainer.assets).forEach(([assetId, asset]) => {
            const assetTransform = asset[orientation];
            if (assetTransform.position.reference === 'container') {
              // Only update container-relative assets for the changed axis
              const assetUpdates = {
                ...assetTransform,
                position: {
                  ...assetTransform.position,
                  ...(deltaX !== 0 ? { x: assetTransform.position.x } : {}),
                  ...(deltaY !== 0 ? { y: assetTransform.position.y } : {})
                }
              };
              updateAsset(selectedId, assetId, assetUpdates, orientation);
            }
          });

          updateDependentContainers(childContainer.id);
        }
      });
    };

    updateDependentContainers(selectedId);
  };

  // Add lastPositionRef near other refs
  const lastPositionRef = useRef<{x: number, y: number} | null>(null);

  return (
    <div 
      ref={containerRef}
      className="relative h-full"
    >
      {/* Load all images */}
      {imageIds.map(id => (
        <ImageLoader
          key={id}
          id={id}
          src={uploadedImages[id] || ''}
          onLoad={handleImageLoad}
        />
      ))}
      
      <div className={`absolute inset-0 rounded-lg border-2 transition-colors duration-200 ${
        isActive ? 'border-editor-accent' : 'border-editor-grid'
      }`} style={{
        width: isInfinite ? '100%' : width + 44,
        height: isInfinite ? '100%' : height + 88,
        background: '#1a1b26',
        borderRadius: isInfinite ? '0' : '40px',
        overflow: 'hidden'
      }}>
        {!isInfinite && (
          <div className="absolute left-1/2 -translate-x-1/2 w-32 h-7 bg-editor-grid rounded-b-2xl" />
        )}

        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <AlignmentTools
            selectedIds={selectedId ? [selectedId] : []}
            onAlign={handleAlign}
          />
        </div>

        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          className="canvas-stage absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          onClick={handleStageClick}
          onTap={handleStageClick}
          onMouseDown={handleStageClick}
          style={{
            background: '#1a1b26'
          }}
          onWheel={(e) => {
            // Only handle zoom if Ctrl/Cmd is pressed
            if (e.evt.ctrlKey || e.evt.metaKey) {
              e.evt.preventDefault();
            }
          }}
          scale={transform ? { x: transform.scale, y: transform.scale } : undefined}
          x={transform ? transform.x : 0}
          y={transform ? transform.y : 0}
        >
          <Layer>
            {/* Grid */}
            <Group>
              {Array.from({ length: Math.ceil(stageWidth / GRID_SIZE) }).map((_, i) => (
                <Line
                  key={`v${i}`}
                  points={[i * GRID_SIZE, 0, i * GRID_SIZE, stageHeight]}
                  stroke="#1f2937"
                  strokeWidth={1}
                />
              ))}
              {Array.from({ length: Math.ceil(stageHeight / GRID_SIZE) }).map((_, i) => (
                <Line
                  key={`h${i}`}
                  points={[0, i * GRID_SIZE, stageWidth, i * GRID_SIZE]}
                  stroke="#1f2937"
                  strokeWidth={1}
                />
              ))}
            </Group>

            {/* Content group with proper transform handling */}
            <Group 
              x={centerX} 
              y={centerY}
              scaleX={1}
              scaleY={1}
            >
              {/* Device bounds indicator in infinite mode - Moved to top of group but with listening={false} */}
              {isInfinite && (
                <Rect
                  width={width}
                  height={height}
                  stroke="#7aa2f7"
                  strokeWidth={2}
                  dash={[5, 5]}
                  fill="transparent"
                  listening={false}
                />
              )}
              
              {/* Render sorted containers */}
              {sortedContainers.map(renderContainer)}

              {/* Transformer */}
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
            </Group>

            {/* Alignment Guides */}
            <AlignmentGuides
              guides={guides}
              canvasWidth={stageWidth}
              canvasHeight={stageHeight}
            />
          </Layer>
        </Stage>
      </div>
    </div>
  );
};
