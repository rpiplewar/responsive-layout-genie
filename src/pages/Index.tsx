import { Button } from '@/components/ui/button';
import { Canvas } from '@/components/Canvas';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { useLayoutStore } from '../store/layoutStore';
import { Download, Plus, Clipboard, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const Index = () => {
  const { addContainer, getExportData } = useLayoutStore();
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);

  const handleAddContainer = () => {
    addContainer();
  };

  const handleExport = () => {
    const layout = getExportData();
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

  return (
    <div className="min-h-screen bg-editor-bg text-white">
      <div className="p-4 border-b border-editor-grid">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Phaser Layout Tool</h1>
          <div className="space-x-2">
            <Button
              variant="outline"
              className="bg-editor-grid border-editor-grid hover:bg-editor-accent/20"
              onClick={handleAddContainer}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Container
            </Button>
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
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Layout
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 p-4">
        <div className="flex-1 space-x-4 flex">
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">Portrait Mode</h2>
            <Canvas orientation="portrait" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">Landscape Mode</h2>
            <Canvas orientation="landscape" />
          </div>
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
};

export default Index;