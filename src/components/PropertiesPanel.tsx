import { useLayoutStore, Container, AssetTransform, AssetMetadata } from '../store/layoutStore';
import { Button } from '@/components/ui/button';
import { Trash2, Copy } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useToast } from "@/hooks/use-toast";
import { ContainerProperties } from './ContainerProperties';
import { AssetProperties } from './AssetProperties';
import React, { useRef } from 'react';

export const PropertiesPanel = () => {
  const { toast } = useToast();
  const { 
    containers, 
    selectedId, 
    selectedAssetId,
    selectedDevice, 
    updateContainer, 
    deleteContainer, 
    setSelectedId,
    updateContainerName,
    getContainerPath,
    addContainer,
    addAsset,
    updateAsset,
    deleteAsset,
    updateAssetName,
    setSelectedAssetId,
    uploadImage,
    updateAssetKey,
    assetMetadata,
    duplicateAsset,
  } = useLayoutStore();

  const selectedContainer = containers.find((c) => c.id === selectedId);
  const selectedAsset = selectedContainer?.assets[selectedAssetId ?? ''];
  const containerPath = selectedId ? getContainerPath(selectedId) : [];

  // If nothing is selected
  if (!selectedContainer && !selectedAsset) {
    return (
      <div className="w-64 bg-editor-bg p-4 border-l border-editor-grid">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Properties</h3>
          <p className="text-gray-400">No layer selected</p>
        </div>
      </div>
    );
  }

  const handleParentSelect = () => {
    if (selectedContainer?.parentId) {
      setSelectedId(selectedContainer.parentId);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedId && selectedAssetId) {
      const assetId = crypto.randomUUID();
      
      // Create a promise that resolves when the image is uploaded
      const uploadPromise = new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          
          // Create image element to get dimensions
          const img = new Image();
          img.onload = () => {
            uploadImage(assetId, file);
            resolve();
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      });

      // Wait for the image to be uploaded before updating the asset key
      uploadPromise.then(() => {
        updateAssetKey(selectedId, selectedAssetId, assetId);
        toast({
          title: "Image uploaded",
          description: "The image has been uploaded successfully",
        });
      });
    }
  };

  return (
    <div className="w-64 bg-editor-bg p-4 border-l border-editor-grid space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Properties</h3>
        <div className="flex gap-2">
          {selectedContainer && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteContainer(selectedContainer.id)}
              title="Delete Container"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {selectedAsset && selectedContainer && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteAsset(selectedContainer.id, selectedAsset.id)}
              title="Delete Asset"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {containerPath.length > 0 && (
        <Breadcrumb>
          {containerPath.map((container, index) => (
            <React.Fragment key={container.id}>
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={() => setSelectedId(container.id)}
                  className={`cursor-pointer ${
                    container.id === selectedId ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {container.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
              {index < containerPath.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </Breadcrumb>
      )}

      {/* Conditional rendering based on selection */}
      {selectedContainer && !selectedAssetId && (
        <ContainerProperties
          container={selectedContainer}
          selectedDevice={selectedDevice}
          onUpdateContainer={updateContainer}
          onUpdateContainerName={updateContainerName}
          onParentSelect={handleParentSelect}
        />
      )}

      {selectedAssetId && selectedContainer && (
        <AssetProperties
          asset={selectedContainer.assets[selectedAssetId]}
          containerId={selectedId!}
          assetOptions={Object.values(selectedContainer.assets)
            .filter(a => a.id !== selectedAssetId)
            .map(a => ({ id: a.id, name: a.name }))}
          assetMetadata={assetMetadata}
          onUpdateAsset={updateAsset}
          onUpdateAssetName={updateAssetName}
          onUpdateAssetKey={updateAssetKey}
          onImageUpload={handleImageUpload}
        />
      )}
    </div>
  );
};
