import { useLayoutStore } from '../store/layoutStore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image as ImageIcon, Trash2, Copy } from 'lucide-react';

export const AssetLibrary = () => {
  const { uploadedImages, assetMetadata, uploadImage, deleteAssetFromLibrary } = useLayoutStore();
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.size > 5242880) { // 5MB
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 5MB limit`,
        });
        return;
      }

      const assetId = crypto.randomUUID();
      uploadImage(assetId, file);
      toast({
        title: "Asset uploaded",
        description: `${file.name} has been uploaded successfully`,
      });
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-64 bg-editor-bg p-4 border-l border-editor-grid">
      <div className="space-y-4">
        <h3 className="font-medium text-white">Asset Library</h3>
        
        <div className="border-2 border-editor-grid rounded-lg p-4 text-center hover:border-editor-accent/50 transition-colors">
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <Label htmlFor="asset-upload" className="cursor-pointer">
            <p className="text-sm text-gray-400">
              Click to upload images
            </p>
            <p className="text-xs text-gray-500 mt-1">Max size: 5MB</p>
          </Label>
          <input
            id="asset-upload"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="space-y-2">
          {Object.entries(uploadedImages).map(([id, src]) => {
            const metadata = assetMetadata[id];
            return (
              <div 
                key={id}
                className="rounded-lg overflow-hidden border border-editor-grid bg-editor-grid/20"
              >
                <div className="aspect-video relative">
                  <img 
                    src={src} 
                    alt={metadata?.name || ''}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white truncate" title={metadata?.name}>
                      {metadata?.name}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-editor-accent"
                        onClick={() => {
                          navigator.clipboard.writeText(id);
                          toast({
                            title: "Asset ID copied",
                            description: "The asset ID has been copied to your clipboard",
                          });
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-red-400"
                        onClick={() => {
                          deleteAssetFromLibrary(id);
                          toast({
                            title: "Asset deleted",
                            description: "The asset has been removed from the library",
                          });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {metadata?.dimensions && (
                    <p className="text-xs text-gray-400">
                      {metadata.dimensions.width} × {metadata.dimensions.height}px • {formatFileSize(metadata.size)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}; 