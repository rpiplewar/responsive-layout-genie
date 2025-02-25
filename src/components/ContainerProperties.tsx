import { Container } from '../store/layoutStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { devices } from '../config/devices';

interface ContainerPropertiesProps {
  container: Container;
  selectedDevice: string;
  onUpdateContainer: (id: string, updates: Partial<Container['portrait']>, orientation: 'portrait' | 'landscape') => void;
  onUpdateContainerName: (id: string, name: string) => void;
  onParentSelect: () => void;
}

export const ContainerProperties: React.FC<ContainerPropertiesProps> = ({
  container,
  selectedDevice,
  onUpdateContainer,
  onUpdateContainerName,
  onParentSelect,
}) => {
  const device = devices[selectedDevice];

  const getPercentage = (value: number, dimension: number) => {
    return ((value / dimension) * 100).toFixed(2);
  };

  const handleChange = (key: keyof Container['portrait'], value: string | number, orientation: 'portrait' | 'landscape') => {
    onUpdateContainer(container.id, { [key]: value }, orientation);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-gray-400">Name</Label>
        <Input
          value={container.name}
          onChange={(e) => onUpdateContainerName(container.id, e.target.value)}
          className="bg-editor-grid text-white border-editor-grid"
        />
      </div>

      {container.parentId && (
        <Button
          variant="outline"
          size="sm"
          className="w-full bg-editor-grid border-editor-grid hover:bg-editor-accent/20"
          onClick={onParentSelect}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Parent
        </Button>
      )}

      <div className="space-y-4">
        <h4 className="font-medium text-white">Portrait Mode</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-gray-400">Center X</Label>
            <div className="space-y-1">
              <Input
                type="number"
                value={container.portrait.x}
                onChange={(e) => handleChange('x', parseFloat(e.target.value), 'portrait')}
                className="bg-editor-grid text-white border-editor-grid"
              />
              <div className="text-xs text-gray-400">
                {getPercentage(container.portrait.x, device.width)}%
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">Center Y</Label>
            <div className="space-y-1">
              <Input
                type="number"
                value={container.portrait.y}
                onChange={(e) => handleChange('y', parseFloat(e.target.value), 'portrait')}
                className="bg-editor-grid text-white border-editor-grid"
              />
              <div className="text-xs text-gray-400">
                {getPercentage(container.portrait.y, device.height)}%
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
                value={container.portrait.width}
                onChange={(e) => handleChange('width', parseFloat(e.target.value), 'portrait')}
                className="bg-editor-grid text-white border-editor-grid"
              />
              <div className="text-xs text-gray-400">
                {getPercentage(container.portrait.width, device.width)}%
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">Height</Label>
            <div className="space-y-1">
              <Input
                type="number"
                value={container.portrait.height}
                onChange={(e) => handleChange('height', parseFloat(e.target.value), 'portrait')}
                className="bg-editor-grid text-white border-editor-grid"
              />
              <div className="text-xs text-gray-400">
                {getPercentage(container.portrait.height, device.height)}%
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
                value={container.landscape.x}
                onChange={(e) => handleChange('x', parseFloat(e.target.value), 'landscape')}
                className="bg-editor-grid text-white border-editor-grid"
              />
              <div className="text-xs text-gray-400">
                {getPercentage(container.landscape.x, device.height)}%
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">Center Y</Label>
            <div className="space-y-1">
              <Input
                type="number"
                value={container.landscape.y}
                onChange={(e) => handleChange('y', parseFloat(e.target.value), 'landscape')}
                className="bg-editor-grid text-white border-editor-grid"
              />
              <div className="text-xs text-gray-400">
                {getPercentage(container.landscape.y, device.width)}%
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
                value={container.landscape.width}
                onChange={(e) => handleChange('width', parseFloat(e.target.value), 'landscape')}
                className="bg-editor-grid text-white border-editor-grid"
              />
              <div className="text-xs text-gray-400">
                {getPercentage(container.landscape.width, device.height)}%
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">Height</Label>
            <div className="space-y-1">
              <Input
                type="number"
                value={container.landscape.height}
                onChange={(e) => handleChange('height', parseFloat(e.target.value), 'landscape')}
                className="bg-editor-grid text-white border-editor-grid"
              />
              <div className="text-xs text-gray-400">
                {getPercentage(container.landscape.height, device.width)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 