import { Button } from '@/components/ui/button';
import { Canvas } from '@/components/Canvas';
import { CanvasModal } from '@/components/CanvasModal';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { AssetLibrary } from '@/components/AssetLibrary';
import { useLayoutStore } from '../store/layoutStore';
import { Download, Plus, Clipboard, Check, Maximize2, Undo2, Redo2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

const Index = () => {
  const { addContainer, getExportData, exportLayout, undo, redo, canUndo, canRedo } = useLayoutStore();
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const [expandedView, setExpandedView] = useState<'portrait' | 'landscape' | null>(null);

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
    addContainer();
  };

  const handleExport = async () => {
    exportLayout();
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

      <div className="flex">
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