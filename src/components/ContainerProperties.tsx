import { Container } from '../store/layoutStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Copy } from 'lucide-react';
import { devices } from '../config/devices';
import { useLayoutStore } from '../store/layoutStore';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  const { containers, copyOrientationToLandscape, copyOrientationToPortrait } = useLayoutStore();
  const { toast } = useToast();

  const getParentDimensions = (orientation: 'portrait' | 'landscape') => {
    if (!container.parentId) {
      return {
        width: orientation === 'portrait' ? device.width : device.height,
        height: orientation === 'portrait' ? device.height : device.width
      };
    }
    const parentContainer = containers.find(c => c.id === container.parentId);
    return parentContainer ? {
      width: parentContainer[orientation].width,
      height: parentContainer[orientation].height
    } : {
      width: orientation === 'portrait' ? device.width : device.height,
      height: orientation === 'portrait' ? device.height : device.width
    };
  };

  const getPercentage = (value: number, dimension: 'width' | 'height', orientation: 'portrait' | 'landscape', isPosition: boolean = false) => {
    const parentDims = getParentDimensions(orientation);
    if (!container.parentId) {
      // For root containers, calculate percentage of device dimensions
      return ((value / parentDims[dimension]) * 100).toFixed(2);
    }

    const parent = containers.find(c => c.id === container.parentId);
    if (!parent) return "0.00";

    if (isPosition) {
      // For positions, calculate relative to parent's origin
      const parentPos = parent[orientation];
      const relativeValue = dimension === 'width' 
        ? value - parentPos.x 
        : value - parentPos.y;
      return ((relativeValue / parentDims[dimension]) * 100).toFixed(2);
    }

    // For dimensions, calculate as percentage of parent's dimensions
    return ((value / parentDims[dimension]) * 100).toFixed(2);
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
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-white">Portrait Mode</h4>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="bg-editor-grid hover:bg-editor-accent/20 text-white"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy from Landscape
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Copy to Portrait</AlertDialogTitle>
                <AlertDialogDescription>
                  This will overwrite all portrait properties with landscape properties for this container and its children. This action can be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  copyOrientationToPortrait(container.id);
                  toast({
                    title: "Properties copied",
                    description: "Landscape properties have been copied to portrait mode",
                  });
                }}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

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
                {getPercentage(container.portrait.x, 'width', 'portrait', true)}%
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
                {getPercentage(container.portrait.y, 'height', 'portrait', true)}%
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
                {getPercentage(container.portrait.width, 'width', 'portrait')}%
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
                {getPercentage(container.portrait.height, 'height', 'portrait')}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-white">Landscape Mode</h4>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="bg-editor-grid hover:bg-editor-accent/20 text-white"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy from Portrait
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Copy to Landscape</AlertDialogTitle>
                <AlertDialogDescription>
                  This will overwrite all landscape properties with portrait properties for this container and its children. This action can be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  copyOrientationToLandscape(container.id);
                  toast({
                    title: "Properties copied",
                    description: "Portrait properties have been copied to landscape mode",
                  });
                }}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

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
                {getPercentage(container.landscape.x, 'width', 'landscape', true)}%
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
                {getPercentage(container.landscape.y, 'height', 'landscape', true)}%
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
                {getPercentage(container.landscape.width, 'width', 'landscape')}%
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
                {getPercentage(container.landscape.height, 'height', 'landscape')}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 