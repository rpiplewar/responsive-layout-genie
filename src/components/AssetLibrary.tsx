import { useLayoutStore } from '../store/layoutStore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image as ImageIcon, Trash2, Copy, Replace, Edit2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const AssetLibrary = () => {
  const { uploadedImages, assetMetadata, uploadImage, deleteAssetFromLibrary } = useLayoutStore();
  const { toast } = useToast();
  const [assetKey, setAssetKey] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [pendingReplace, setPendingReplace] = useState<{ key: string, file: File } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, replaceKey?: string) => {
    const files = event.target.files;
    if (!files) return;

    if (replaceKey) {
      const file = files[0];
      if (file.size > 5242880) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 5MB limit`,
        });
        return;
      }
      setPendingReplace({ key: replaceKey, file });
      setShowReplaceDialog(true);
    } else {
      // Handle multiple files
      Array.from(files).forEach(file => {
        if (file.size > 5242880) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds the 5MB limit`,
          });
          return;
        }
        const baseKey = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        const uniqueKey = `${baseKey}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        uploadImage(uniqueKey, file);
        toast({
          title: "Asset uploaded",
          description: `${file.name} has been uploaded with key: ${uniqueKey}`,
        });
      });
      setSelectedFile(null);
    }
    
    // Reset the file input
    event.target.value = '';
  };

  const handleUpload = () => {
    if (!selectedFile || !assetKey) {
      toast({
        title: "Missing information",
        description: "Please provide both an asset key and select a file",
        variant: "destructive",
      });
      return;
    }

    if (uploadedImages[assetKey]) {
      setPendingReplace({ key: assetKey, file: selectedFile });
      setShowReplaceDialog(true);
      return;
    }

    proceedWithUpload(assetKey, selectedFile);
  };

  const proceedWithUpload = (key: string, file: File) => {
    uploadImage(key, file);
    toast({
      title: file.name === assetMetadata[key]?.name ? "Asset replaced" : "Asset uploaded",
      description: `${file.name} has been ${file.name === assetMetadata[key]?.name ? 'replaced' : 'uploaded'} with key: ${key}`,
    });
    setAssetKey('');
    setSelectedFile(null);
    setPendingReplace(null);
    setShowReplaceDialog(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <>
      <div className="w-64 bg-editor-bg p-4 border-l border-editor-grid">
        <div className="space-y-4">
          <h3 className="font-medium text-white">Asset Library</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="asset-key" className="text-gray-400">Asset Key</Label>
              <Input
                id="asset-key"
                value={assetKey}
                onChange={(e) => setAssetKey(e.target.value)}
                placeholder="Enter unique asset key"
                className="bg-editor-grid text-white border-editor-grid"
              />
            </div>

            <div className="border-2 border-editor-grid rounded-lg p-4 text-center hover:border-editor-accent/50 transition-colors">
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <Label htmlFor="asset-upload" className="cursor-pointer">
                <p className="text-sm text-gray-400">
                  Click to upload image
                </p>
                <p className="text-xs text-gray-500 mt-1">Max size: 5MB</p>
              </Label>
              <input
                ref={fileInputRef}
                id="asset-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileChange(e)}
              />
            </div>

            {selectedFile && (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Selected file: {selectedFile.name}</p>
                <Button
                  onClick={handleUpload}
                  className="w-full bg-editor-accent hover:bg-editor-accent/80"
                >
                  Upload Asset
                </Button>
              </div>
            )}
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
                      {editingKey === id ? (
                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (newKey && newKey !== id) {
                              if (uploadedImages[newKey]) {
                                toast({
                                  title: "Key already exists",
                                  description: "Please choose a different key",
                                  variant: "destructive",
                                });
                                return;
                              }
                              const oldData = uploadedImages[id];
                              const oldMetadata = assetMetadata[id];
                              uploadImage(newKey, new File([dataURItoBlob(oldData)], oldMetadata.name));
                              deleteAssetFromLibrary(id);
                              toast({
                                title: "Asset key updated",
                                description: `Key changed from ${id} to ${newKey}`,
                              });
                            }
                            setEditingKey(null);
                            setNewKey('');
                          }}
                          className="flex-1 mr-2"
                        >
                          <Input
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            className="h-6 text-sm bg-editor-grid/50"
                            placeholder="Enter new key"
                            autoFocus
                          />
                        </form>
                      ) : (
                        <p className="text-sm text-white truncate" title={id}>
                          {id}
                        </p>
                      )}
                      <div className="flex gap-1">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, id)}
                          id={`replace-${id}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-editor-accent"
                          onClick={() => {
                            const input = document.getElementById(`replace-${id}`);
                            if (input) {
                              input.click();
                            }
                          }}
                        >
                          <Replace className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-editor-accent"
                          onClick={() => {
                            navigator.clipboard.writeText(id);
                            toast({
                              title: "Asset key copied",
                              description: "The asset key has been copied to your clipboard",
                            });
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-editor-accent"
                          onClick={() => {
                            if (editingKey === id) {
                              setEditingKey(null);
                              setNewKey('');
                            } else {
                              setEditingKey(id);
                              setNewKey(id);
                            }
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
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

      <AlertDialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Existing Asset?</AlertDialogTitle>
            <AlertDialogDescription>
              An asset with key "{pendingReplace?.key}" already exists. Replacing it will update the image while preserving all layout settings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowReplaceDialog(false);
              setPendingReplace(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingReplace) {
                proceedWithUpload(pendingReplace.key, pendingReplace.file);
              }
            }}>
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

function dataURItoBlob(dataURI: string) {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
} 