import { Button } from '@/components/ui/button';
import { Canvas } from '@/components/Canvas';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { useLayoutStore } from '../store/layoutStore';
import { Download, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const Index = () => {
  const { containers, addContainer } = useLayoutStore();
  const { toast } = useToast();

  const handleExport = () => {
    const layout = {
      PORTRAIT: containers.reduce((acc, container) => ({
        ...acc,
        [container.name]: {
          x: container.x / 400, // normalize to 0-1
          y: container.y / 600,
          width: container.width / 400,
          height: container.height / 600,
        },
      }), {}),
      LANDSCAPE: containers.reduce((acc, container) => ({
        ...acc,
        [container.name]: {
          x: container.x / 600,
          y: container.y / 400,
          width: container.width / 600,
          height: container.height / 400,
        },
      }), {}),
    };

    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'layout.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Layout exported successfully",
      description: "Your layout has been downloaded as layout.json",
    });
  };

  return (
    <div className="min-h-screen bg-editor-bg text-white">
      <div className="p-4 border-b border-editor-grid">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Phaser Layout Tool</h1>
          <div className="space-x-2">
            <Button
              variant="outline"
              className="bg-editor-grid border-editor-grid hover:bg-editor-accent/20"
              onClick={addContainer}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Container
            </Button>
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

      <div className="flex gap-4 p-4">
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Portrait Mode (400x600)</h2>
            <div className="border border-editor-grid rounded-lg overflow-hidden">
              <Canvas orientation="portrait" width={400} height={600} />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">Landscape Mode (600x400)</h2>
            <div className="border border-editor-grid rounded-lg overflow-hidden">
              <Canvas orientation="landscape" width={600} height={400} />
            </div>
          </div>
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
};

export default Index;