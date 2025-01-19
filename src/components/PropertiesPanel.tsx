import { useLayoutStore, Container, AssetTransform } from '../store/layoutStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, ArrowLeft } from 'lucide-react';
import { devices } from '../config/devices';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Checkbox } from "@/components/ui/checkbox";

export const PropertiesPanel = () => {
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
  } = useLayoutStore();

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
        {selectedContainer.parentId && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-editor-grid border-editor-grid hover:bg-editor-accent/20"
            onClick={handleParentSelect}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Parent
          </Button>
        )}
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
                  <Input
                    value={asset.name}
                    onChange={(e) => updateAssetName(selectedId!, asset.id, e.target.value)}
                    className="bg-editor-grid text-white border-editor-grid"
                  />
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
                    id="maintainAspectRatio"
                    checked={selectedAsset.portrait.maintainAspectRatio}
                    onCheckedChange={(checked) =>
                      handleAssetChange('maintainAspectRatio', checked, 'portrait')
                    }
                  />
                  <Label
                    htmlFor="maintainAspectRatio"
                    className="text-gray-400"
                  >
                    Maintain Aspect Ratio
                  </Label>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

