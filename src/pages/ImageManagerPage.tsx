import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuickCollection } from '@/contexts/QuickCollectionContext';
import { storage } from '@/lib/firebase';
import {
  ref,
  listAll,
  uploadBytes,
  deleteObject,
  getDownloadURL,
  getMetadata
} from 'firebase/storage';
import { toast } from 'sonner';
import {
  Folder,
  File as FileIcon,
  Upload,
  FolderPlus,
  ArrowLeft,
  Trash2,
  Image as ImageIcon,
  RefreshCw,
  Home,
  ChevronDown,
  ChevronRight,
  Images,
  Copy,
} from 'lucide-react';

interface FileItem {
  name: string;
  id?: string;
  isFolder: boolean;
  size?: number;
  createdAt?: string;
}

interface ImageGroup {
  baseName: string;
  primaryImage: FileItem;
  relatedImages: FileItem[];
  allImages: FileItem[];
}

// Extract base name from YEAR_WorkName pattern (e.g., "2015_Salt Bride" from "2015_Salt Bride_2.jpg")
const extractBaseName = (filename: string): string => {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');

  // Pattern: YEAR_WorkName or YEAR_WorkName_suffix
  // We want to extract YEAR_WorkName (everything before the last underscore if it's a suffix like _2, _detail, etc.)
  const match = nameWithoutExt.match(/^(\d{4}_[^_]+(?:_[^_\d][^_]*)*)/);

  if (match) {
    return match[1];
  }

  // Fallback: check if last part after underscore looks like a suffix (number or common words)
  const parts = nameWithoutExt.split('_');
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].toLowerCase();
    const suffixPatterns = /^(\d+|detail|details|installation|view|front|back|side|left|right|top|bottom|close|closeup|full|alt|v\d+)$/i;

    if (suffixPatterns.test(lastPart) && parts.length >= 2) {
      // Remove the suffix part to get base name
      return parts.slice(0, -1).join('_');
    }
  }

  // If no suffix detected, the whole name (without extension) is the base
  return nameWithoutExt;
};

export default function ImageManagerPage() {
  const navigate = useNavigate();
  const { items } = useQuickCollection();
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('grouped');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    if (!storage) return;
    setIsLoading(true);
    try {
      const storageRef = ref(storage, currentPath);
      const result = await listAll(storageRef);

      const folderItems: FileItem[] = result.prefixes.map(prefix => ({
        name: prefix.name,
        isFolder: true,
      }));

      const fileItems: FileItem[] = await Promise.all(
        result.items.map(async (item) => {
          try {
            const metadata = await getMetadata(item);
            return {
              name: item.name,
              isFolder: false,
              size: metadata.size,
              createdAt: metadata.timeCreated,
            };
          } catch (e) {
            return {
              name: item.name,
              isFolder: false,
            };
          }
        })
      );

      setFiles([...folderItems, ...fileItems]);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  // ... (groupedFiles useMemo stays same)

  useEffect(() => {
    loadFiles();
  }, [currentPath]);

  // Group images by base name (YEAR_WorkName pattern)
  const groupedFiles = useMemo(() => {
    const folders = files.filter(f => f.isFolder);
    const imageFiles = files.filter(f => !f.isFolder && f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i));
    const otherFiles = files.filter(f => !f.isFolder && !f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i));

    // Group images by base name
    const groups: Map<string, FileItem[]> = new Map();

    imageFiles.forEach(file => {
      const baseName = extractBaseName(file.name);
      if (!groups.has(baseName)) {
        groups.set(baseName, []);
      }
      groups.get(baseName)!.push(file);
    });

    // Convert to ImageGroup array
    const imageGroups: ImageGroup[] = Array.from(groups.entries()).map(([baseName, groupFiles]) => {
      // Sort files - primary image first (no suffix or shortest name), then others
      const sortedFiles = [...groupFiles].sort((a, b) => {
        const aName = a.name.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
        const bName = b.name.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
        // Primary image matches baseName exactly
        if (aName === baseName) return -1;
        if (bName === baseName) return 1;
        return a.name.localeCompare(b.name);
      });

      return {
        baseName,
        primaryImage: sortedFiles[0],
        relatedImages: sortedFiles.slice(1),
        allImages: sortedFiles,
      };
    });

    return { folders, imageGroups, otherFiles };
  }, [files]);

  const toggleGroupExpanded = (baseName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(baseName)) {
        next.delete(baseName);
      } else {
        next.add(baseName);
      }
      return next;
    });
  };

  const navigateToFolder = (folderName: string) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setCurrentPath(newPath);
  };

  const navigateUp = () => {
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  const navigateToRoot = () => {
    setCurrentPath('');
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    // Firebase Storage doesn't have real folders, so we create a placeholder file
    const folderPath = currentPath
      ? `${currentPath}/${newFolderName}/.keep`
      : `${newFolderName}/.keep`;

    try {
      const storageRef = ref(storage, folderPath);
      await uploadBytes(storageRef, new Blob(['placeholder'], { type: 'text/plain' }));

      toast.success(`Folder "${newFolderName}" created`);
      setNewFolderName('');
      setShowNewFolderInput(false);
      loadFiles();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to create folder');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0 || !storage) return;

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const file of Array.from(uploadedFiles)) {
      const relativePath = (file as any).webkitRelativePath || file.name;
      const filePath = currentPath
        ? `${currentPath}/${relativePath}`
        : relativePath;

      try {
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, file);
        successCount++;
      } catch (err) {
        console.error(`Error uploading ${file.name}:`, err);
        errorCount++;
      }
    }

    setIsUploading(false);

    if (successCount > 0) toast.success(`Uploaded ${successCount} file(s)`);
    if (errorCount > 0) toast.error(`Failed to upload ${errorCount} file(s)`);

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';

    loadFiles();
  };

  const deleteItem = async (item: FileItem) => {
    if (!storage) return;
    const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;

    try {
      if (item.isFolder) {
        // Recursive delete not supported natively, but we can delete contents if managed
        const storageRef = ref(storage, itemPath);
        const result = await listAll(storageRef);

        const deletePromises = result.items.map(fileRef => deleteObject(fileRef));
        await Promise.all(deletePromises);

        // Also delete any nested folders recursively if you want, but keep it simple for now
        toast.success(`Folder contents deleted`);
      } else {
        const storageRef = ref(storage, itemPath);
        await deleteObject(storageRef);
        toast.success(`File "${item.name}" deleted`);
      }
      loadFiles();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete item');
    }
  };

  const deleteImageGroup = async (group: ImageGroup) => {
    if (!storage) return;
    try {
      const deletePromises = group.allImages.map(img => {
        const path = currentPath ? `${currentPath}/${img.name}` : img.name;
        return deleteObject(ref(storage, path));
      });

      await Promise.all(deletePromises);
      toast.success(`Deleted ${group.allImages.length} image(s) for "${group.baseName}"`);
      loadFiles();
    } catch (err) {
      console.error('Delete group error:', err);
      toast.error('Failed to delete image group');
    }
  };

  const getPublicUrl = async (fileName: string) => {
    if (!storage) return '';
    const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
    try {
      return await getDownloadURL(ref(storage, filePath));
    } catch (e) {
      return '';
    }
  };

  const copyUrl = async (fileName: string) => {
    const url = await getPublicUrl(fileName);
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success('URL copied to clipboard');
    } else {
      toast.error('Failed to get URL');
    }
  };

  const copyAllUrls = async (group: ImageGroup) => {
    const urlPromises = group.allImages.map(img => getPublicUrl(img.name));
    const urls = (await Promise.all(urlPromises)).filter(u => u).join('\n');
    navigator.clipboard.writeText(urls);
    toast.success(`Copied ${group.allImages.length} URL(s) to clipboard`);
  };

  const breadcrumbs = currentPath ? currentPath.split('/') : [];

  const renderFileRow = (item: FileItem, indent: boolean = false) => (
    <div
      key={item.name}
      className={`grid grid-cols-12 gap-4 px-4 py-3 border-b border-border hover:bg-secondary/50 transition-colors ${indent ? 'pl-12' : ''}`}
    >
      <div
        className={`col-span-6 flex items-center gap-3 ${item.isFolder ? 'cursor-pointer' : ''}`}
        onClick={() => item.isFolder && navigateToFolder(item.name)}
      >
        {item.isFolder ? (
          <Folder className="w-5 h-5 text-primary" />
        ) : item.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
          <ImageIcon className="w-5 h-5 text-accent" />
        ) : (
          <FileIcon className="w-5 h-5 text-muted-foreground" />
        )}
        <span className={item.isFolder ? 'font-medium' : ''}>
          {item.name}
        </span>
      </div>
      <div className="col-span-2 text-sm text-muted-foreground flex items-center">
        {item.size ? `${Math.round(item.size / 1024)} KB` : '-'}
      </div>
      <div className="col-span-2 text-sm text-muted-foreground flex items-center">
        {item.createdAt
          ? new Date(item.createdAt).toLocaleDateString()
          : '-'}
      </div>
      <div className="col-span-2 flex items-center justify-end gap-2">
        {!item.isFolder && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyUrl(item.name)}
          >
            <Copy className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => deleteItem(item)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const renderImageGroup = (group: ImageGroup) => {
    const isExpanded = expandedGroups.has(group.baseName);
    const hasRelated = group.relatedImages.length > 0;

    return (
      <div key={group.baseName}>
        {/* Group header row */}
        <div
          className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border hover:bg-secondary/50 transition-colors cursor-pointer"
          onClick={() => hasRelated && toggleGroupExpanded(group.baseName)}
        >
          <div className="col-span-6 flex items-center gap-3">
            {hasRelated ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )
            ) : (
              <span className="w-4" />
            )}
            <Images className="w-5 h-5 text-primary" />
            <span className="font-medium">{group.baseName}</span>
            {hasRelated && (
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                {group.allImages.length} images
              </span>
            )}
          </div>
          <div className="col-span-2 text-sm text-muted-foreground flex items-center">
            {group.primaryImage.size ? `${Math.round(group.primaryImage.size / 1024)} KB` : '-'}
          </div>
          <div className="col-span-2 text-sm text-muted-foreground flex items-center">
            {group.primaryImage.createdAt
              ? new Date(group.primaryImage.createdAt).toLocaleDateString()
              : '-'}
          </div>
          <div className="col-span-2 flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyAllUrls(group)}
              title="Copy all URLs"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteImageGroup(group)}
              className="text-destructive hover:text-destructive"
              title="Delete all images in group"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Expanded images */}
        {isExpanded && hasRelated && (
          <div className="bg-secondary/30">
            {group.allImages.map(img => (
              <div
                key={img.name}
                className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-border/50 hover:bg-secondary/50 transition-colors pl-12"
              >
                <div className="col-span-6 flex items-center gap-3">
                  <ImageIcon className="w-4 h-4 text-accent" />
                  <span className="text-sm">{img.name}</span>
                  {img.name === group.primaryImage.name && (
                    <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded">primary</span>
                  )}
                </div>
                <div className="col-span-2 text-sm text-muted-foreground flex items-center">
                  {img.size ? `${Math.round(img.size / 1024)} KB` : '-'}
                </div>
                <div className="col-span-2 text-sm text-muted-foreground flex items-center">
                  {img.createdAt
                    ? new Date(img.createdAt).toLocaleDateString()
                    : '-'}
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyUrl(img.name)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteItem(img)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-[1440px] mx-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Image Manager</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload and manage artwork images • YEAR_WorkName naming convention
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/search')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-6 p-4 bg-secondary rounded-lg">
          {/* Breadcrumb navigation */}
          <div className="flex items-center gap-1 flex-1">
            <button
              onClick={navigateToRoot}
              className="flex items-center gap-1 px-2 py-1 text-sm hover:bg-border rounded transition-colors"
            >
              <Home className="w-4 h-4" />
              Root
            </button>
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center">
                <span className="text-muted-foreground mx-1">/</span>
                <button
                  onClick={() => {
                    const newPath = breadcrumbs.slice(0, index + 1).join('/');
                    setCurrentPath(newPath);
                  }}
                  className="px-2 py-1 text-sm hover:bg-border rounded transition-colors"
                >
                  {crumb}
                </button>
              </div>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1.5 text-sm ${viewMode === 'grouped' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
            >
              <Images className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`px-3 py-1.5 text-sm ${viewMode === 'flat' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
            >
              <FileIcon className="w-4 h-4" />
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={loadFiles}>
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewFolderInput(!showNewFolderInput)}
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </Button>

          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Files
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => folderInputRef.current?.click()}
            disabled={isUploading}
          >
            <Folder className="w-4 h-4 mr-2" />
            Upload Folder
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            // @ts-ignore
            webkitdirectory=""
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* New folder input */}
        {showNewFolderInput && (
          <div className="flex items-center gap-2 mb-4 p-4 bg-secondary rounded-lg">
            <Input
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createFolder()}
              className="max-w-xs"
            />
            <Button onClick={createFolder}>Create</Button>
            <Button variant="ghost" onClick={() => setShowNewFolderInput(false)}>
              Cancel
            </Button>
          </div>
        )}

        {/* Upload progress */}
        {isUploading && (
          <div className="mb-4 p-4 bg-primary/10 rounded-lg text-center">
            <p className="text-sm">Uploading files...</p>
          </div>
        )}

        {/* File list */}
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-secondary text-sm font-medium">
            <div className="col-span-6">Name</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Back button */}
          {currentPath && (
            <div
              onClick={navigateUp}
              className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border hover:bg-secondary/50 cursor-pointer transition-colors"
            >
              <div className="col-span-6 flex items-center gap-3">
                <Folder className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground">..</span>
              </div>
              <div className="col-span-2"></div>
              <div className="col-span-2"></div>
              <div className="col-span-2"></div>
            </div>
          )}

          {/* Loading state */}
          {isLoading ? (
            <div className="px-4 py-12 text-center text-muted-foreground">
              Loading...
            </div>
          ) : files.length === 0 ? (
            <div className="px-4 py-12 text-center text-muted-foreground">
              <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>This folder is empty</p>
              <p className="text-sm mt-1">Upload files or create a new folder</p>
            </div>
          ) : viewMode === 'flat' ? (
            // Flat view - show all files
            files.map((item) => renderFileRow(item))
          ) : (
            // Grouped view
            <>
              {/* Folders first */}
              {groupedFiles.folders.map((folder) => renderFileRow(folder))}

              {/* Image groups */}
              {groupedFiles.imageGroups.map((group) => renderImageGroup(group))}

              {/* Other files */}
              {groupedFiles.otherFiles.map((file) => renderFileRow(file))}
            </>
          )}
        </div>

        {/* Stats */}
        {!isLoading && files.length > 0 && viewMode === 'grouped' && (
          <div className="mt-4 text-sm text-muted-foreground">
            {groupedFiles.folders.length} folders • {groupedFiles.imageGroups.length} artwork groups • {groupedFiles.imageGroups.reduce((acc, g) => acc + g.allImages.length, 0)} images
          </div>
        )}
      </div>
    </div>
  );
}