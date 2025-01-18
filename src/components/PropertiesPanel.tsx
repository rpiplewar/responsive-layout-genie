import { useLayoutStore, Container } from '../store/layoutStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { devices } from '../config/devices';

export const PropertiesPanel = () => {
  const { containers, selectedId, selectedDevice, updateContainer, deleteContainer, setSelectedDevice } = useLayoutStore();
  const selectedContainer = containers.find((c) => c.id === selectedId);

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

  const device = devices[selectedDevice];

  const getPercentage = (value: number, dimension: number) => {
    return ((value / dimension) * 100).toFixed(2);
  };

  const handleChange = (key: keyof Container['portrait'], value: string | number, orientation: 'portrait' | 'landscape') => {
    updateContainer(selectedId!, { [key]: value }, orientation);
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
          onChange={(e) => {
            const newContainer = { ...selectedContainer, name: e.target.value };
            updateContainer(selectedId!, newContainer.portrait, 'portrait');
          }}
          className="bg-editor-grid text-white border-editor-grid"
        />
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
    </div>
  );
};