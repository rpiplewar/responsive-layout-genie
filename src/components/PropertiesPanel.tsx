import { useLayoutStore, Container, AssetTransform, AssetMetadata } from '../store/layoutStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, ArrowLeft, Upload, Eye, EyeOff } from 'lucide-react';
import { devices } from '../config/devices';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

declare global {
  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
  }
}

interface FileSystemDirectoryHandle {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream {
  write(data: any): Promise<void>;
  close(): Promise<void>;
}

export const PropertiesPanel = () => {
  const { toast } = useToast();
  const { 
    containers, 
    selectedId, 
    selectedAssetId,
    selectedDevice, 
    updateContainer, 
    deleteContainer, 
    setSelectedId,
    setSelectedDevice,
    updateContainerName,
    getContainerPath,
    addContainer,
    addAsset,
    updateAsset,
    deleteAsset,
    updateAssetName,
    setSelectedAssetId,
    uploadImage,
    updateAssetKey,
    assetMetadata,
    importConfig,
    getExportData,
    uploadedImages,
    toggleAssetVisibility,
  } = useLayoutStore();

  const handleImportConfig = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
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
        .map(([_, file]) => file);

      // Upload all images
      const uploadPromises = imageFiles.map(async (file) => {
        const assetId = file.name.replace('assets/', '').replace('.png', '');
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

      // Import the configuration
      importConfig(config);

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
  };

  const selectedContainer = containers.find((c) => c.id === selectedId);
  const selectedAsset = selectedContainer?.assets[selectedAssetId ?? ''];
  const containerPath = selectedId ? getContainerPath(selectedId) : [];

  if (!selectedContainer) {
    return (
      <div className="w-64 bg-editor-bg p-4 border-l border-editor-grid">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-400">Device</Label>
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

          <div className="space-y-2">
            <div className="border-2 border-editor-grid rounded-lg p-4 text-center hover:border-editor-accent/50 transition-colors">
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <Label htmlFor="config-upload" className="cursor-pointer">
                <p className="text-sm text-gray-400">
                  Import layout
                </p>
                <p className="text-xs text-gray-500 mt-1">Select the layout-export.zip file</p>
              </Label>
              <input
                id="config-upload"
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleImportConfig}
              />
            </div>
          </div>

          <p className="text-gray-400">No container selected</p>
        </div>
      </div>
    );
  }

  const handleAddAsset = () => {
    if (selectedId) {
      addAsset(selectedId);
    }
  };

  const handleAssetChange = (key: keyof AssetTransform, value: any, orientation: 'portrait' | 'landscape') => {
    if (selectedId && selectedAssetId) {
      updateAsset(selectedId, selectedAssetId, { [key]: value }, orientation);
    }
  };

  const device = devices[selectedDevice];

  const getPercentage = (value: number, dimension: number) => {
    return ((value / dimension) * 100).toFixed(2);
  };

  const handleChange = (key: keyof Container['portrait'], value: string | number, orientation: 'portrait' | 'landscape') => {
    updateContainer(selectedId!, { [key]: value }, orientation);
  };

  const handleAddChild = () => {
    addContainer(selectedId);
  };

  const handleParentSelect = () => {
    if (selectedContainer.parentId) {
      setSelectedId(selectedContainer.parentId);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedId && selectedAssetId) {
      const assetId = crypto.randomUUID();
      
      // Create a promise that resolves when the image is uploaded
      const uploadPromise = new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          
          // Create image element to get dimensions
          const img = new Image();
          img.onload = () => {
            uploadImage(assetId, file);
            resolve();
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      });

      // Wait for the image to be uploaded before updating the asset key
      uploadPromise.then(() => {
        updateAssetKey(selectedId, selectedAssetId, assetId);
        toast({
          title: "Image uploaded",
          description: "The image has been uploaded successfully",
        });
      });
    }
  };

  return (
    <div className="w-64 bg-editor-bg p-4 border-l border-editor-grid space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Properties</h3>
        <Button
          variant="ghost"
          size="icon"
          className="text-red-500 hover:text-red-400"
          onClick={() => deleteContainer(selectedId!)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {containerPath.length > 0 && (
        <Breadcrumb>
          {containerPath.map((container, index) => (
            <>
              <BreadcrumbItem key={container.id}>
                <BreadcrumbLink 
                  onClick={() => setSelectedId(container.id)}
                  className="text-sm text-gray-400 hover:text-white cursor-pointer"
                >
                  {container.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
              {index < containerPath.length - 1 && <BreadcrumbSeparator />}
            </>
          ))}
        </Breadcrumb>
      )}

      {selectedContainer && (
        <>
      <div className="space-y-2">
        <Label className="text-gray-400">Device</Label>
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

      <div className="space-y-2">
        <Label className="text-gray-400">Name</Label>
        <Input
          value={selectedContainer.name}
          onChange={(e) => updateContainerName(selectedId!, e.target.value)}
          className="bg-editor-grid text-white border-editor-grid"
        />
      </div>

      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 bg-editor-grid border-editor-grid hover:bg-editor-accent/20"
          onClick={handleParentSelect}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Parent
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 bg-editor-grid border-editor-grid hover:bg-editor-accent/20"
          onClick={handleAddChild}
        >
          Add Child
        </Button>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-white">Portrait Mode</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-gray-400">Center X</Label>
            <div className="space-y-1">
              <Input
                type="number"
                value={selectedContainer.portrait.x}
                onChange={(e) => handleChange('x', parseFloat(e.target.value), 'portrait')}
                className="bg-editor-grid text-white border-editor-grid"
              />
              <div className="text-xs text-gray-400">
                {getPercentage(selectedContainer.portrait.x, device.width)}%
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">Center Y</Label>
            <div className="space-y-1">
              <Input
                type="number"
                value={selectedContainer.portrait.y}
                onChange={(e) => handleChange('y', parseFloat(e.target.value), 'portrait')}
                className="bg-editor-grid text-white border-editor-grid"
              />
              <div className="text-xs text-gray-400">
                {getPercentage(selectedContainer.portrait.y, device.height)}%
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-gray-400">Width</Label>
            <div className="space-y-1">
              <Input
                type="number"
                value={selectedContainer.portrait.width}
                onChange={(e) => handleChange('width', parseFloat(e.target.value), 'portrait')}
                className="bg-editor-grid text-white border-editor-grid"
              />
              <div className="text-xs text-gray-400">
                {getPercentage(selectedContainer.portrait.width, device.width)}%
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">Height</Label>
            <div className="space-y-1">
              <Input
                type="number"
                value={selectedContainer.portrait.height}
                onChange={(e) => handleChange('height', parseFloat(e.target.value), 'portrait')}
                className="bg-editor-grid text-white border-editor-grid"
              />
              <div className="text-xs text-gray-400">
                {getPercentage(selectedContainer.portrait.height, device.height)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-white">Landscape Mode</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-gray-400">Center X</Label>
            <div className="space-y-1">
              <Input
                type="number"
                value={selectedContainer.landscape.x}
                onChange={(e) => handleChange('x', parseFloat(e.target.value), 'landscape')}
                className="bg-editor-grid text-white border-editor-grid"
              />
              <div className="text-xs text-gray-400">
                {getPercentage(selectedContainer.landscape.x, device.height)}%
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">Center Y</Label>
            <div className="space-y-1">
              <Input
                type="number"
                value={selectedContainer.landscape.y}
                onChange={(e) => handleChange('y', parseFloat(e.target.value), 'landscape')}
                className="bg-editor-grid text-white border-editor-grid"
              />
              <div className="text-xs text-gray-400">
                {getPercentage(selectedContainer.landscape.y, device.width)}%
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-gray-400">Width</Label>
            <div className="space-y-1">
              <Input
                type="number"
                value={selectedContainer.landscape.width}
                onChange={(e) => handleChange('width', parseFloat(e.target.value), 'landscape')}
                className="bg-editor-grid text-white border-editor-grid"
              />
              <div className="text-xs text-gray-400">
                {getPercentage(selectedContainer.landscape.width, device.height)}%
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">Height</Label>
            <div className="space-y-1">
              <Input
                type="number"
                value={selectedContainer.landscape.height}
                onChange={(e) => handleChange('height', parseFloat(e.target.value), 'landscape')}
                className="bg-editor-grid text-white border-editor-grid"
              />
              <div className="text-xs text-gray-400">
                {getPercentage(selectedContainer.landscape.height, device.width)}%
              </div>
            </div>
          </div>
        </div>
      </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-white">Assets</h4>
              <Button
                variant="outline"
                size="sm"
                className="bg-editor-grid border-editor-grid hover:bg-editor-accent/20"
                onClick={handleAddAsset}
              >
                Add Asset
              </Button>
            </div>

            {Object.values(selectedContainer.assets).map((asset) => (
              <div
                key={asset.id}
                className={`p-2 rounded border ${
                  selectedAssetId === asset.id
                    ? 'border-editor-accent bg-editor-accent/20'
                    : 'border-editor-grid'
                }`}
                onClick={() => setSelectedAssetId(asset.id)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 flex-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-6 w-6 ${asset.visible === false ? 'text-gray-400' : 'text-editor-accent'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAssetVisibility(selectedId!, asset.id);
                      }}
                    >
                      {asset.visible === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Input
                      value={asset.name}
                      onChange={(e) => updateAssetName(selectedId!, asset.id, e.target.value)}
                      className="bg-editor-grid text-white border-editor-grid"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-400"
                    onClick={() => deleteAsset(selectedId!, asset.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {selectedAsset && (
              <div className="space-y-4">
                <h4 className="font-medium text-white">Asset Properties</h4>
                
                <div className="space-y-2">
                  <Label className="text-gray-400">Select Asset</Label>
                  <Select
                    value={selectedAsset.key}
                    onValueChange={(value) => updateAssetKey(selectedId!, selectedAssetId!, value)}
                  >
                    <SelectTrigger className="bg-editor-grid text-white border-editor-grid">
                      <SelectValue placeholder="Choose an asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(assetMetadata).map(([id, metadata]) => (
                        <SelectItem key={id} value={id}>
                          {id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <h5 className="font-medium text-white">Portrait Mode</h5>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Reference</Label>
                    <Select
                      value={selectedAsset.portrait.position.reference}
                      onValueChange={(value) =>
                        handleAssetChange(
                          'position',
                          { ...selectedAsset.portrait.position, reference: value },
                          'portrait'
                        )
                      }
                    >
                      <SelectTrigger className="bg-editor-grid text-white border-editor-grid">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="container">Container</SelectItem>
                        {Object.values(selectedContainer.assets)
                          .filter((a) => a.id !== selectedAsset.id)
                          .map((asset) => (
                            <SelectItem key={asset.id} value={asset.id}>
                              {asset.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-gray-400">Position X</Label>
                      <Input
                        type="number"
                        step="any"
                        min="-10"
                        max="10"
                        value={selectedAsset.portrait.position.x}
                        onChange={(e) =>
                          handleAssetChange(
                            'position',
                            {
                              ...selectedAsset.portrait.position,
                              x: parseFloat(e.target.value),
                            },
                            'portrait'
                          )
                        }
                        className="bg-editor-grid text-white border-editor-grid"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-400">Position Y</Label>
                      <Input
                        type="number"
                        step="any"
                        min="-10"
                        max="10"
                        value={selectedAsset.portrait.position.y}
                        onChange={(e) =>
                          handleAssetChange(
                            'position',
                            {
                              ...selectedAsset.portrait.position,
                              y: parseFloat(e.target.value),
                            },
                            'portrait'
                          )
                        }
                        className="bg-editor-grid text-white border-editor-grid"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-gray-400">Width</Label>
                      <Input
                        type="number"
                        value={selectedAsset.portrait.size.width}
                        onChange={(e) =>
                          handleAssetChange(
                            'size',
                            {
                              ...selectedAsset.portrait.size,
                              width: parseFloat(e.target.value),
                            },
                            'portrait'
                          )
                        }
                        className="bg-editor-grid text-white border-editor-grid"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-400">Height</Label>
                      <Input
                        type="number"
                        value={selectedAsset.portrait.size.height}
                        onChange={(e) =>
                          handleAssetChange(
                            'size',
                            {
                              ...selectedAsset.portrait.size,
                              height: parseFloat(e.target.value),
                            },
                            'portrait'
                          )
                        }
                        className="bg-editor-grid text-white border-editor-grid"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-gray-400">Origin X</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={selectedAsset.portrait.origin.x}
                        onChange={(e) =>
                          handleAssetChange(
                            'origin',
                            {
                              ...selectedAsset.portrait.origin,
                              x: parseFloat(e.target.value),
                            },
                            'portrait'
                          )
                        }
                        className="bg-editor-grid text-white border-editor-grid"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-400">Origin Y</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={selectedAsset.portrait.origin.y}
                        onChange={(e) =>
                          handleAssetChange(
                            'origin',
                            {
                              ...selectedAsset.portrait.origin,
                              y: parseFloat(e.target.value),
                            },
                            'portrait'
                          )
                        }
                        className="bg-editor-grid text-white border-editor-grid"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-400">Scale Mode</Label>
                    <Select
                      value={selectedAsset.portrait.scaleMode}
                      onValueChange={(value) =>
                        handleAssetChange('scaleMode', value, 'portrait')
                      }
                    >
                      <SelectTrigger className="bg-editor-grid text-white border-editor-grid">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fit">Fit</SelectItem>
                        <SelectItem value="fill">Fill</SelectItem>
                        <SelectItem value="stretch">Stretch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-400">Rotation (degrees)</Label>
                    <Input
                      type="number"
                      value={selectedAsset.portrait.rotation}
                      onChange={(e) =>
                        handleAssetChange('rotation', parseFloat(e.target.value), 'portrait')
                      }
                      className="bg-editor-grid text-white border-editor-grid"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="maintainAspectRatioPortrait"
                      checked={selectedAsset.portrait.maintainAspectRatio}
                      onCheckedChange={(checked) =>
                        handleAssetChange('maintainAspectRatio', checked, 'portrait')
                      }
                    />
                    <Label
                      htmlFor="maintainAspectRatioPortrait"
                      className="text-gray-400"
                    >
                      Maintain Aspect Ratio
                    </Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="font-medium text-white">Landscape Mode</h5>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Reference</Label>
                    <Select
                      value={selectedAsset.landscape.position.reference}
                      onValueChange={(value) =>
                        handleAssetChange(
                          'position',
                          { ...selectedAsset.landscape.position, reference: value },
                          'landscape'
                        )
                      }
                    >
                      <SelectTrigger className="bg-editor-grid text-white border-editor-grid">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="container">Container</SelectItem>
                        {Object.values(selectedContainer.assets)
                          .filter((a) => a.id !== selectedAsset.id)
                          .map((asset) => (
                            <SelectItem key={asset.id} value={asset.id}>
                              {asset.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-gray-400">Position X</Label>
                      <Input
                        type="number"
                        step="any"
                        min="-10"
                        max="10"
                        value={selectedAsset.landscape.position.x}
                        onChange={(e) =>
                          handleAssetChange(
                            'position',
                            {
                              ...selectedAsset.landscape.position,
                              x: parseFloat(e.target.value),
                            },
                            'landscape'
                          )
                        }
                        className="bg-editor-grid text-white border-editor-grid"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-400">Position Y</Label>
                      <Input
                        type="number"
                        step="any"
                        min="-10"
                        max="10"
                        value={selectedAsset.landscape.position.y}
                        onChange={(e) =>
                          handleAssetChange(
                            'position',
                            {
                              ...selectedAsset.landscape.position,
                              y: parseFloat(e.target.value),
                            },
                            'landscape'
                          )
                        }
                        className="bg-editor-grid text-white border-editor-grid"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-gray-400">Width</Label>
                      <Input
                        type="number"
                        value={selectedAsset.landscape.size.width}
                        onChange={(e) =>
                          handleAssetChange(
                            'size',
                            {
                              ...selectedAsset.landscape.size,
                              width: parseFloat(e.target.value),
                            },
                            'landscape'
                          )
                        }
                        className="bg-editor-grid text-white border-editor-grid"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-400">Height</Label>
                      <Input
                        type="number"
                        value={selectedAsset.landscape.size.height}
                        onChange={(e) =>
                          handleAssetChange(
                            'size',
                            {
                              ...selectedAsset.landscape.size,
                              height: parseFloat(e.target.value),
                            },
                            'landscape'
                          )
                        }
                        className="bg-editor-grid text-white border-editor-grid"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-gray-400">Origin X</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={selectedAsset.landscape.origin.x}
                        onChange={(e) =>
                          handleAssetChange(
                            'origin',
                            {
                              ...selectedAsset.landscape.origin,
                              x: parseFloat(e.target.value),
                            },
                            'landscape'
                          )
                        }
                        className="bg-editor-grid text-white border-editor-grid"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-400">Origin Y</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={selectedAsset.landscape.origin.y}
                        onChange={(e) =>
                          handleAssetChange(
                            'origin',
                            {
                              ...selectedAsset.landscape.origin,
                              y: parseFloat(e.target.value),
                            },
                            'landscape'
                          )
                        }
                        className="bg-editor-grid text-white border-editor-grid"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-400">Scale Mode</Label>
                    <Select
                      value={selectedAsset.landscape.scaleMode}
                      onValueChange={(value) =>
                        handleAssetChange('scaleMode', value, 'landscape')
                      }
                    >
                      <SelectTrigger className="bg-editor-grid text-white border-editor-grid">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fit">Fit</SelectItem>
                        <SelectItem value="fill">Fill</SelectItem>
                        <SelectItem value="stretch">Stretch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-400">Rotation (degrees)</Label>
                    <Input
                      type="number"
                      value={selectedAsset.landscape.rotation}
                      onChange={(e) =>
                        handleAssetChange('rotation', parseFloat(e.target.value), 'landscape')
                      }
                      className="bg-editor-grid text-white border-editor-grid"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="maintainAspectRatioLandscape"
                      checked={selectedAsset.landscape.maintainAspectRatio}
                      onCheckedChange={(checked) =>
                        handleAssetChange('maintainAspectRatio', checked, 'landscape')
                      }
                    />
                    <Label
                      htmlFor="maintainAspectRatioLandscape"
                      className="text-gray-400"
                    >
                      Maintain Aspect Ratio
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
