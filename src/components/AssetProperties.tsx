import { Asset, AssetTransform, AssetMetadata } from '../store/layoutStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from '@/components/ui/button';
import { Upload, Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface AssetPropertiesProps {
  asset: Asset;
  containerId: string;
  assetOptions: { id: string; name: string }[];
  assetMetadata: Record<string, AssetMetadata>;
  onUpdateAsset: (containerId: string, assetId: string, updates: Partial<AssetTransform>, orientation: 'portrait' | 'landscape') => void;
  onUpdateAssetName: (containerId: string, assetId: string, name: string) => void;
  onUpdateAssetKey: (containerId: string, assetId: string, key: string) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AssetProperties: React.FC<AssetPropertiesProps> = ({
  asset,
  containerId,
  assetOptions,
  assetMetadata,
  onUpdateAsset,
  onUpdateAssetName,
  onUpdateAssetKey,
  onImageUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const handleAssetChange = (key: keyof AssetTransform, value: string | number | boolean | Record<string, unknown>, orientation: 'portrait' | 'landscape') => {
    onUpdateAsset(containerId, asset.id, { [key]: value }, orientation);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-gray-400">Name</Label>
        <Input
          value={asset.name}
          onChange={(e) => onUpdateAssetName(containerId, asset.id, e.target.value)}
          className="bg-editor-grid text-white border-editor-grid"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-gray-400">Select Asset</Label>
        <div className="flex gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between bg-editor-grid text-white border-editor-grid hover:bg-editor-accent/20"
              >
                {asset.key || "Choose an asset..."}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput 
                  placeholder="Search assets..." 
                  value={searchValue}
                  onValueChange={setSearchValue}
                  className="h-9"
                />
                <CommandEmpty>No assets found.</CommandEmpty>
                <CommandGroup>
                  <ScrollArea className="h-[200px]">
                    {Object.entries(assetMetadata)
                      .filter(([id, metadata]) => 
                        metadata.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                        id.toLowerCase().includes(searchValue.toLowerCase())
                      )
                      .map(([id, metadata]) => (
                        <CommandItem
                          key={id}
                          value={id}
                          onSelect={() => {
                            onUpdateAssetKey(containerId, asset.id, id);
                            setOpen(false);
                          }}
                          className="cursor-pointer"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{id}</span>
                            <span className="text-xs text-gray-400">{metadata.name}</span>
                          </div>
                        </CommandItem>
                      ))}
                  </ScrollArea>
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="icon"
            className="bg-editor-grid border-editor-grid hover:bg-editor-accent/20"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onImageUpload}
          />
        </div>
      </div>

      {/* Portrait Mode Properties */}
      <div className="space-y-4">
        <h5 className="font-medium text-white">Portrait Mode</h5>
        <div className="space-y-2">
          <Label className="text-gray-400">Reference</Label>
          <Select
            value={asset.portrait.position.reference}
            onValueChange={(value) =>
              handleAssetChange(
                'position',
                { ...asset.portrait.position, reference: value },
                'portrait'
              )
            }
          >
            <SelectTrigger className="bg-editor-grid text-white border-editor-grid">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="container">Container</SelectItem>
              {assetOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-gray-400">Position X</Label>
            <Input
              type="number"
              step="any"
              min="-10"
              max="10"
              value={asset.portrait.position.x}
              onChange={(e) =>
                handleAssetChange(
                  'position',
                  {
                    ...asset.portrait.position,
                    x: parseFloat(e.target.value),
                  },
                  'portrait'
                )
              }
              className="bg-editor-grid text-white border-editor-grid"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">Position Y</Label>
            <Input
              type="number"
              step="any"
              min="-10"
              max="10"
              value={asset.portrait.position.y}
              onChange={(e) =>
                handleAssetChange(
                  'position',
                  {
                    ...asset.portrait.position,
                    y: parseFloat(e.target.value),
                  },
                  'portrait'
                )
              }
              className="bg-editor-grid text-white border-editor-grid"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-gray-400">Width</Label>
            <Input
              type="number"
              value={asset.portrait.size.width}
              onChange={(e) =>
                handleAssetChange(
                  'size',
                  {
                    ...asset.portrait.size,
                    width: parseFloat(e.target.value),
                  },
                  'portrait'
                )
              }
              className="bg-editor-grid text-white border-editor-grid"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">Height</Label>
            <Input
              type="number"
              value={asset.portrait.size.height}
              onChange={(e) =>
                handleAssetChange(
                  'size',
                  {
                    ...asset.portrait.size,
                    height: parseFloat(e.target.value),
                  },
                  'portrait'
                )
              }
              className="bg-editor-grid text-white border-editor-grid"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-gray-400">Origin X</Label>
            <Input
              type="number"
              step="0.1"
              value={asset.portrait.origin.x}
              onChange={(e) =>
                handleAssetChange(
                  'origin',
                  {
                    ...asset.portrait.origin,
                    x: parseFloat(e.target.value),
                  },
                  'portrait'
                )
              }
              className="bg-editor-grid text-white border-editor-grid"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">Origin Y</Label>
            <Input
              type="number"
              step="0.1"
              value={asset.portrait.origin.y}
              onChange={(e) =>
                handleAssetChange(
                  'origin',
                  {
                    ...asset.portrait.origin,
                    y: parseFloat(e.target.value),
                  },
                  'portrait'
                )
              }
              className="bg-editor-grid text-white border-editor-grid"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-400">Scale Mode</Label>
          <Select
            value={asset.portrait.scaleMode}
            onValueChange={(value) =>
              handleAssetChange('scaleMode', value, 'portrait')
            }
          >
            <SelectTrigger className="bg-editor-grid text-white border-editor-grid">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fit">Fit</SelectItem>
              <SelectItem value="fill">Fill</SelectItem>
              <SelectItem value="stretch">Stretch</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-400">Rotation (degrees)</Label>
          <Input
            type="number"
            value={asset.portrait.rotation}
            onChange={(e) =>
              handleAssetChange('rotation', parseFloat(e.target.value), 'portrait')
            }
            className="bg-editor-grid text-white border-editor-grid"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="maintainAspectRatioPortrait"
            checked={asset.portrait.maintainAspectRatio}
            onCheckedChange={(checked) =>
              handleAssetChange('maintainAspectRatio', checked, 'portrait')
            }
          />
          <Label
            htmlFor="maintainAspectRatioPortrait"
            className="text-gray-400"
          >
            Maintain Aspect Ratio
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="is-visible-portrait"
            checked={asset.portrait.isVisible !== false}
            onCheckedChange={(checked) => handleAssetChange('isVisible', checked, 'portrait')}
          />
          <Label htmlFor="is-visible-portrait" className="text-gray-400">
            Visible
          </Label>
        </div>
      </div>

      {/* Landscape Mode Properties */}
      <div className="space-y-4">
        <h5 className="font-medium text-white">Landscape Mode</h5>
        <div className="space-y-2">
          <Label className="text-gray-400">Reference</Label>
          <Select
            value={asset.landscape.position.reference}
            onValueChange={(value) =>
              handleAssetChange(
                'position',
                { ...asset.landscape.position, reference: value },
                'landscape'
              )
            }
          >
            <SelectTrigger className="bg-editor-grid text-white border-editor-grid">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="container">Container</SelectItem>
              {assetOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-gray-400">Position X</Label>
            <Input
              type="number"
              step="any"
              min="-10"
              max="10"
              value={asset.landscape.position.x}
              onChange={(e) =>
                handleAssetChange(
                  'position',
                  {
                    ...asset.landscape.position,
                    x: parseFloat(e.target.value),
                  },
                  'landscape'
                )
              }
              className="bg-editor-grid text-white border-editor-grid"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">Position Y</Label>
            <Input
              type="number"
              step="any"
              min="-10"
              max="10"
              value={asset.landscape.position.y}
              onChange={(e) =>
                handleAssetChange(
                  'position',
                  {
                    ...asset.landscape.position,
                    y: parseFloat(e.target.value),
                  },
                  'landscape'
                )
              }
              className="bg-editor-grid text-white border-editor-grid"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-gray-400">Width</Label>
            <Input
              type="number"
              value={asset.landscape.size.width}
              onChange={(e) =>
                handleAssetChange(
                  'size',
                  {
                    ...asset.landscape.size,
                    width: parseFloat(e.target.value),
                  },
                  'landscape'
                )
              }
              className="bg-editor-grid text-white border-editor-grid"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">Height</Label>
            <Input
              type="number"
              value={asset.landscape.size.height}
              onChange={(e) =>
                handleAssetChange(
                  'size',
                  {
                    ...asset.landscape.size,
                    height: parseFloat(e.target.value),
                  },
                  'landscape'
                )
              }
              className="bg-editor-grid text-white border-editor-grid"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-gray-400">Origin X</Label>
            <Input
              type="number"
              step="0.1"
              value={asset.landscape.origin.x}
              onChange={(e) =>
                handleAssetChange(
                  'origin',
                  {
                    ...asset.landscape.origin,
                    x: parseFloat(e.target.value),
                  },
                  'landscape'
                )
              }
              className="bg-editor-grid text-white border-editor-grid"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">Origin Y</Label>
            <Input
              type="number"
              step="0.1"
              value={asset.landscape.origin.y}
              onChange={(e) =>
                handleAssetChange(
                  'origin',
                  {
                    ...asset.landscape.origin,
                    y: parseFloat(e.target.value),
                  },
                  'landscape'
                )
              }
              className="bg-editor-grid text-white border-editor-grid"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-400">Scale Mode</Label>
          <Select
            value={asset.landscape.scaleMode}
            onValueChange={(value) =>
              handleAssetChange('scaleMode', value, 'landscape')
            }
          >
            <SelectTrigger className="bg-editor-grid text-white border-editor-grid">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fit">Fit</SelectItem>
              <SelectItem value="fill">Fill</SelectItem>
              <SelectItem value="stretch">Stretch</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-400">Rotation (degrees)</Label>
          <Input
            type="number"
            value={asset.landscape.rotation}
            onChange={(e) =>
              handleAssetChange('rotation', parseFloat(e.target.value), 'landscape')
            }
            className="bg-editor-grid text-white border-editor-grid"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="maintainAspectRatioLandscape"
            checked={asset.landscape.maintainAspectRatio}
            onCheckedChange={(checked) =>
              handleAssetChange('maintainAspectRatio', checked, 'landscape')
            }
          />
          <Label
            htmlFor="maintainAspectRatioLandscape"
            className="text-gray-400"
          >
            Maintain Aspect Ratio
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="is-visible-landscape"
            checked={asset.landscape.isVisible !== false}
            onCheckedChange={(checked) => handleAssetChange('isVisible', checked, 'landscape')}
          />
          <Label htmlFor="is-visible-landscape" className="text-gray-400">
            Visible
          </Label>
        </div>
      </div>
    </div>
  );
}; 