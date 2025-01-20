# Phaser Layout Tool - Technical Documentation

## Project Overview

The Phaser Layout Tool is a React-based web application that helps developers design responsive layouts for games or applications that need to work in both portrait and landscape orientations. It's particularly focused on mobile device layouts, allowing developers to create and configure containers and assets that adapt to different screen orientations.

## Core Technologies

- **React**: Frontend framework
- **TypeScript**: Programming language
- **Vite**: Build tool and development server
- **Zustand**: State management
- **shadcn/ui**: UI component library
- **Tailwind CSS**: Utility-first CSS framework
- **Konva**: Canvas-based drawing library for interactive elements

## Key Components Breakdown

### 1. State Management (src/store/layoutStore.ts)

The application uses Zustand for state management, defined in `layoutStore.ts`. The store manages:

- Containers (rectangular regions that can hold assets)
- Assets (images or other content within containers)
- Selection state (currently selected container/asset)
- Device settings

Key interfaces:
```typescript
interface Container {
  id: string;
  name: string;
  portrait: ContainerPosition;  // Position and size in portrait mode
  landscape: ContainerPosition; // Position and size in landscape mode
  parentId?: string;
  assets: { [key: string]: Asset };
}

interface Asset {
  id: string;
  name: string;
  type: 'image';
  key: string;
  portrait: AssetTransform;
  landscape: AssetTransform;
}
```

Main store actions:
- `addContainer`: Creates a new container
- `updateContainer`: Modifies container properties
- `addAsset`: Adds an asset to a container
- `updateAsset`: Modifies asset properties
- `deleteContainer/deleteAsset`: Removes containers/assets
- `getExportData`: Generates JSON output of the layout

### 2. Canvas Component (src/components/Canvas.tsx)

The Canvas component renders the visual editor using Konva. It handles:

- Drawing the grid background
- Rendering containers and their assets
- Drag and drop interactions
- Transform operations (resize, move)
- Different views for portrait and landscape modes

Key features:
- Uses Konva's Stage, Layer, and Rect components
- Implements snap-to-grid functionality
- Handles selection and transformation of containers
- Maintains aspect ratios and constraints

### 3. Properties Panel (src/components/PropertiesPanel.tsx)

The Properties Panel provides the UI for editing selected container or asset properties:

- Container/asset naming
- Position and size inputs
- Asset-specific properties (scale, rotation, etc.)
- Parent-child relationship management
- Device selection

### 4. Main Page (src/pages/Index.tsx)

The main page component orchestrates the application layout:

- Toolbar with actions (Add Container, Export, Copy)
- Split view showing both portrait and landscape modes
- Properties panel integration

### 5. Device Configuration (src/config/devices.ts)

Defines supported device dimensions and configurations:
```typescript
export const devices = {
  'iPhone SE': {
    width: 375,
    height: 667,
  },
  'iPhone 14': {
    width: 390,
    height: 844,
  }
};
```

## Key Features

1. **Responsive Layout Design**
   - Simultaneous portrait/landscape editing
   - Percentage-based positioning
   - Parent-child container relationships

2. **Asset Management**
   - Image upload and positioning
   - Transform controls (scale, rotate)
   - Reference point system

3. **Export Capabilities**
   - JSON export of layout configuration
   - Clipboard copy functionality
   - Normalized coordinate system (0-1 range)

## UI Components

The project uses shadcn/ui components extensively:

- Button, Input, Select for basic controls
- Toast for notifications
- Dialog for modals
- Dropdown for menus

## Development Workflow

1. **State Updates**
   ```typescript
   // Example of updating a container
   updateContainer(id, {
     x: newX,
     y: newY,
     width: newWidth,
     height: newHeight
   }, orientation);
   ```

2. **Canvas Rendering**
   ```typescript
   // Example of container rendering
   <Rect
     x={x}
     y={y}
     width={width}
     height={height}
     draggable
     onDragMove={handleDragMove}
     onTransform={handleTransform}
   />
   ```

3. **Export Format**
   ```json
   {
     "containers": {
       "containerName": {
         "portrait": {
           "x": 0.5,
           "y": 0.3,
           "width": 0.8,
           "height": 0.4
         },
         "landscape": {
           "x": 0.3,
           "y": 0.5,
           "width": 0.4,
           "height": 0.8
         }
       }
     }
   }
   ```

## Tips for Development

1. **State Management**
   - Always use store actions for state modifications
   - Keep transformations and calculations in the store
   - Use the `getContainerPath` helper for hierarchy operations

2. **UI Updates**
   - Coordinate updates between Canvas and Properties Panel
   - Use percentage values for device-independent layouts
   - Handle both portrait and landscape modes simultaneously

3. **Asset Handling**
   - Support different scale modes (fit, fill, stretch)
   - Maintain aspect ratios when specified
   - Handle image loading and error states

4. **Performance Considerations**
   - Optimize canvas redraws
   - Debounce frequent updates
   - Use memoization for complex calculations

## Common Patterns

1. **Container Updates**
```typescript
const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
  const node = e.target;
  updateContainer(id, {
    x: node.x() + node.width() / 2,
    y: node.y() + node.height() / 2,
  }, orientation);
};
```

2. **Asset References**
```typescript
const renderAsset = (containerId: string, asset: Asset) => {
  const container = containers.find(c => c.id === containerId);
  const transform = asset[orientation];
  // Calculate position based on reference point
  const x = calculateAssetPosition(container, transform);
  return <Image x={x} y={y} />;
};
```

3. **Export Transformations**
```typescript
const processContainer = (container: Container) => {
  return {
    portrait: normalizeCoordinates(container.portrait, device),
    landscape: normalizeCoordinates(container.landscape, device),
    assets: processAssets(container.assets)
  };
};
```

## File Organization

The project follows a standard React application structure:
- `/src/components`: UI components
- `/src/store`: State management
- `/src/hooks`: Custom React hooks
- `/src/config`: Configuration files
- `/src/pages`: Page components
- `/src/lib`: Utility functions

## Extension Points

1. **New Container Types**
   - Extend the Container interface
   - Add new rendering logic in Canvas
   - Update the Properties Panel

2. **Additional Asset Types**
   - Add new asset type definitions
   - Implement specific transform handlers
   - Create dedicated property editors

3. **Export Formats**
   - Add new export transformations
   - Implement different serialization formats
   - Support various platform targets

## Testing and Debugging

1. Use the React Developer Tools to inspect component state
2. Monitor Konva events through the browser console
3. Verify coordinate transformations using the grid overlay
4. Test responsive behavior with different device configurations

## To Do
1. Assets need keys on upload (no need to rename again)
2. Allow uploading of videos as well
3. Allow setting asset origin
4. Allow setting position relative to another asset, make it work
5. When changing device, it should work based on percentages