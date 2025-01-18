import { useLayoutStore, Container } from '../store/layoutStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';

export const PropertiesPanel = () => {
  const { containers, selectedId, updateContainer, deleteContainer } = useLayoutStore();
  const selectedContainer = containers.find((c) => c.id === selectedId);

  if (!selectedContainer) {
    return (
      <div className="w-64 bg-editor-bg p-4 border-l border-editor-grid">
        <p className="text-gray-400">No container selected</p>
      </div>
    );
  }

  const handleChange = (key: keyof Container, value: string | number) => {
    updateContainer(selectedId!, { [key]: value });
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
        <Label className="text-gray-400">Name</Label>
        <Input
          value={selectedContainer.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className="bg-editor-grid text-white border-editor-grid"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="text-gray-400">X</Label>
          <Input
            type="number"
            value={selectedContainer.x}
            onChange={(e) => handleChange('x', parseFloat(e.target.value))}
            className="bg-editor-grid text-white border-editor-grid"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-gray-400">Y</Label>
          <Input
            type="number"
            value={selectedContainer.y}
            onChange={(e) => handleChange('y', parseFloat(e.target.value))}
            className="bg-editor-grid text-white border-editor-grid"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="text-gray-400">Width</Label>
          <Input
            type="number"
            value={selectedContainer.width}
            onChange={(e) => handleChange('width', parseFloat(e.target.value))}
            className="bg-editor-grid text-white border-editor-grid"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-gray-400">Height</Label>
          <Input
            type="number"
            value={selectedContainer.height}
            onChange={(e) => handleChange('height', parseFloat(e.target.value))}
            className="bg-editor-grid text-white border-editor-grid"
          />
        </div>
      </div>
    </div>
  );
};