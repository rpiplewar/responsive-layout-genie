import { Button } from '@/components/ui/button';
import { Canvas } from '@/components/Canvas';
import { CanvasModal } from '@/components/CanvasModal';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { AssetLibrary } from '@/components/AssetLibrary';
import { useLayoutStore } from '../store/layoutStore';
import { Download, Plus, Clipboard, Check, Maximize2, Undo2, Redo2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef } from 'react';
import { LayersPanel } from '@/components/LayersPanel';
import { useSyncLayerStore } from '@/store/layerStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { devices } from '../config/devices';

const Index = () => {
  const { 
    addContainer, 
    getExportData, 
    exportLayout, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    selectedId,
    selectedDevice,
    setSelectedDevice,
    containers,
    addAsset,
    importConfig,
    uploadImage
  } = useLayoutStore();
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const [expandedView, setExpandedView] = useState<'portrait' | 'landscape' | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the key is being pressed in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo()) redo();
        } else {
          if (canUndo()) undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  const handleAddContainer = () => {
    console.log('handleAddContainer called');
    console.log('Current state:', {
      selectedId: selectedId,
      selectedContainer: selectedContainer ? { id: selectedContainer.id, name: selectedContainer.name } : null
    });
    
    try {
      // Always create a container at root level when this button is clicked
      addContainer();
    } catch (error) {
      console.error('Error in handleAddContainer:', error);
    }
  };

  const handleAddChildContainer = () => {
    if (selectedId) {
      addContainer(selectedId);
    }
  };

  const handleAddAsset = () => {
    if (selectedId) {
      addAsset(selectedId);
    }
  };

  const handleExport = async () => {
    exportLayout();
  };

  const handleImportClick = () => {
    importFileRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(file);
      
      // Read layout.json
      const layoutFile = zip.file('layout.json');
      if (!layoutFile) {
        throw new Error('No layout.json found in the zip file');
      }

      const configText = await layoutFile.async('text');
      const config = JSON.parse(configText);
      
      if (!config.containers) {
        throw new Error('Invalid configuration format: missing containers');
      }

      // Read all images from the assets folder
      const assetsFolder = zip.folder('assets');
      if (!assetsFolder) {
        throw new Error('No assets folder found in the zip file');
      }

      const imageFiles = Object.entries(assetsFolder.files)
        .filter(([path, file]) => !file.dir && path.endsWith('.png'))
        .map(([path, file]) => ({
          file,
          assetId: path.replace('assets/', '').replace('.png', '')
        }));

      // Upload all images
      const uploadPromises = imageFiles.map(async ({ file, assetId }) => {
        const blob = await file.async('blob');
        const imageFile = new File([blob], `${assetId}.png`, { type: 'image/png' });
        
        return new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            const img = new Image();
            img.onload = () => {
              uploadImage(assetId, imageFile);
              resolve();
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(blob);
        });
      });

      await Promise.all(uploadPromises);

      type AssetType = { key?: string };
      type ContainerType = { assets?: Record<string, AssetType> };
      
      // Update config to ensure asset keys match file names
      const updatedConfig = {
        ...config,
        containers: Object.entries(config.containers as Record<string, ContainerType>).reduce((acc, [name, container]) => {
          if (container.assets) {
            container.assets = Object.entries(container.assets).reduce((assetAcc, [id, asset]) => ({
              ...assetAcc,
              [id]: {
                ...asset,
                key: asset.key || id // Use existing key or fallback to id
              }
            }), {} as Record<string, AssetType>);
          }
          return {
            ...acc,
            [name]: container
          };
        }, {} as Record<string, ContainerType>)
      };

      // Import the updated configuration
      importConfig(updatedConfig);

      toast({
        title: "Import complete",
        description: `Layout configuration and ${imageFiles.length} assets have been imported`,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import layout",
        variant: "destructive",
      });
    }
    
    // Reset the file input
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleCopyToClipboard = async () => {
    const layout = getExportData();
    await navigator.clipboard.writeText(JSON.stringify(layout, null, 2));
    setIsCopied(true);
    
    toast({
      title: "Layout copied to clipboard",
      description: "The layout JSON has been copied to your clipboard",
    });

    setTimeout(() => setIsCopied(false), 2000);
  };

  // Get the selected container
  const selectedContainer = containers.find(c => c.id === selectedId);

  // Keep layer store in sync with layout store
  useSyncLayerStore();

  return (
    <div className="min-h-screen bg-editor-bg text-white">
      <div className="p-4 border-b border-editor-grid">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Phaser Layout Tool</h1>
          
          <div className="flex items-center space-x-4">
            {/* Undo/Redo */}
            <div className="space-x-2">
              <Button
                variant="outline"
                className="bg-editor-grid border-editor-grid hover:bg-editor-accent/20"
                onClick={undo}
                disabled={!canUndo()}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="bg-editor-grid border-editor-grid hover:bg-editor-accent/20"
                onClick={redo}
                disabled={!canRedo()}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Device Selection */}
            <div className="w-40">
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger className="bg-editor-grid text-white border-editor-grid">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(devices).map((device) => (
                    <SelectItem key={device} value={device}>
                      {device}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Container Actions */}
            <div className="space-x-2">
              <Button
                variant="outline"
                className="bg-editor-grid border-editor-grid hover:bg-editor-accent/20"
                onClick={handleAddContainer}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Container
              </Button>
              
              {/* Conditional rendering for container-specific actions */}
              {selectedContainer && (
                <>
                  <Button
                    variant="outline"
                    className="bg-editor-grid border-editor-grid hover:bg-editor-accent/20"
                    onClick={handleAddChildContainer}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Child
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-editor-grid border-editor-grid hover:bg-editor-accent/20"
                    onClick={handleAddAsset}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Asset
                  </Button>
                </>
              )}
              
              <Button
                variant="outline"
                className="bg-editor-grid border-editor-grid hover:bg-editor-accent/20"
                onClick={handleCopyToClipboard}
              >
                {isCopied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Clipboard className="h-4 w-4 mr-2" />
                )}
                {isCopied ? 'Copied!' : 'Copy to Clipboard'}
              </Button>
              <Button
                variant="outline"
                className="bg-editor-grid border-editor-grid hover:bg-editor-accent/20"
                onClick={handleImportClick}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Layout
              </Button>
              <input
                ref={importFileRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleImportFile}
              />
              <Button
                variant="outline"
                className="bg-editor-grid border-editor-grid hover:bg-editor-accent/20"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Layout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        <LayersPanel />
        <div className="w-[450px] p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Portrait Mode</h2>
            <Button
              variant="outline"
              size="sm"
              className="bg-editor-grid border-editor-grid hover:bg-editor-accent/20"
              onClick={() => setExpandedView('portrait')}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
          <Canvas orientation="portrait" />
        </div>

        <div className="flex-1 p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Landscape Mode</h2>
            <Button
              variant="outline"
              size="sm"
              className="bg-editor-grid border-editor-grid hover:bg-editor-accent/20"
              onClick={() => setExpandedView('landscape')}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
          <Canvas orientation="landscape" />
        </div>

        <PropertiesPanel />
        <AssetLibrary />
      </div>

      {expandedView && (
        <CanvasModal 
          orientation={expandedView} 
          onClose={() => setExpandedView(null)} 
        />
      )}
    </div>
  );
};

export default Index;