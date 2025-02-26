import { Position, Size } from '../store/types';
import { AlignmentType, AlignmentControls, AlignmentGuide } from '../store/alignmentStore';

interface Element {
  id: string;
  position: Position;
  size: Size;
}

export const calculateAlignedPosition = (
  element: Element,
  reference: Element,
  alignment: AlignmentControls
): Position => {
  const newPosition = { ...element.position };

  // Horizontal alignment - accounting for center-based positioning
  switch (alignment.horizontal) {
    case 'left':
      // Align left edges, accounting for center-based positions
      newPosition.x = reference.position.x - reference.size.width/2 + element.size.width/2;
      break;
    case 'center':
      // Center alignment is already correct since positions are center-based
      newPosition.x = reference.position.x;
      break;
    case 'right':
      // Align right edges, accounting for center-based positions
      newPosition.x = reference.position.x + reference.size.width/2 - element.size.width/2;
      break;
  }

  // Vertical alignment - accounting for center-based positioning
  switch (alignment.vertical) {
    case 'top':
      // Align top edges, accounting for center-based positions
      newPosition.y = reference.position.y - reference.size.height/2 + element.size.height/2;
      break;
    case 'middle':
      // Middle alignment is already correct since positions are center-based
      newPosition.y = reference.position.y;
      break;
    case 'bottom':
      // Align bottom edges, accounting for center-based positions
      newPosition.y = reference.position.y + reference.size.height/2 - element.size.height/2;
      break;
  }

  return newPosition;
};

export const calculateAlignmentGuides = (
  moving: Element,
  others: Element[],
  threshold: number
): AlignmentGuide[] => {
  const guides: AlignmentGuide[] = [];

  others.forEach(other => {
    // Calculate edge positions accounting for center-based positioning
    const movingLeft = moving.position.x - moving.size.width/2;
    const movingRight = moving.position.x + moving.size.width/2;
    const movingTop = moving.position.y - moving.size.height/2;
    const movingBottom = moving.position.y + moving.size.height/2;

    const otherLeft = other.position.x - other.size.width/2;
    const otherRight = other.position.x + other.size.width/2;
    const otherTop = other.position.y - other.size.height/2;
    const otherBottom = other.position.y + other.size.height/2;

    // Left edge alignment
    if (Math.abs(movingLeft - otherLeft) < threshold) {
      guides.push({
        type: 'left',
        position: otherLeft,
        referenceId: other.id
      });
    }

    // Center alignment (already correct since positions are center-based)
    if (Math.abs(moving.position.x - other.position.x) < threshold) {
      guides.push({
        type: 'center',
        position: other.position.x,
        referenceId: other.id
      });
    }

    // Right edge alignment
    if (Math.abs(movingRight - otherRight) < threshold) {
      guides.push({
        type: 'right',
        position: otherRight,
        referenceId: other.id
      });
    }

    // Top edge alignment
    if (Math.abs(movingTop - otherTop) < threshold) {
      guides.push({
        type: 'top',
        position: otherTop,
        referenceId: other.id
      });
    }

    // Middle alignment (already correct since positions are center-based)
    if (Math.abs(moving.position.y - other.position.y) < threshold) {
      guides.push({
        type: 'middle',
        position: other.position.y,
        referenceId: other.id
      });
    }

    // Bottom edge alignment
    if (Math.abs(movingBottom - otherBottom) < threshold) {
      guides.push({
        type: 'bottom',
        position: otherBottom,
        referenceId: other.id
      });
    }
  });

  return guides;
}; 