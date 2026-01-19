import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { Artwork } from '@/types/gallery';
import { filemakerApi } from '@/lib/filemaker-api';
import { useAuth } from '@/contexts/AuthContext';

export interface CollectionItem {
  recordId: string; // collection_item_id (UUID/PK)
  fmRecordId: string; // internal FM recordId
  workId: number | string;
  SortOrder?: number;
}

export interface Collection {
  id: string; // recordId
  uuid: string; // collection_id (UUID)
  name: string;
  description: string;
  createdAt: Date;
  modifiedAt: Date;
  items: CollectionItem[];
}

interface CollectionsContextType {
  collections: Collection[];
  isLoading: boolean;
  createCollection: (name: string, description?: string, itemIds?: (number | string)[]) => Promise<Collection | null>;
  updateCollection: (id: string, updates: Partial<Omit<Collection, 'id' | 'createdAt'>>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  addItemToCollection: (collectionId: string, workId: number | string) => Promise<void>;
  addItemsToCollection: (collectionId: string, workIds: (number | string)[]) => Promise<void>;
  removeItemFromCollection: (collectionId: string, workId: number | string) => Promise<void>;
  reorderCollectionItems: (collectionId: string, items: CollectionItem[]) => Promise<void>;
  getCollection: (id: string) => Collection | undefined;
  refreshCollections: () => Promise<void>;
}

const CollectionsContext = createContext<CollectionsContextType | undefined>(undefined);


export function CollectionsProvider({ children }: { children: ReactNode }) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { session, currentUser } = useAuth();

  // Load from FileMaker API on mount
  const refreshCollections = async () => {
    if (!session?.gallery_id) {
      setCollections([]);
      setIsLoading(false);
      return;
    }

    try {
      console.log(`Loading collections for gallery: ${session.gallery_id}`);
      const data = await filemakerApi.getCollections(session.gallery_id);
      console.log(`Found ${data.length} collections`);

      // Map FileMaker response to our Collection type and fetch items
      const mapped = await Promise.all(data.map(async (item: any) => {
        console.log(`Fetching items for collection: ${item.CollectionName} (${item.collection_id})`);
        const items = await filemakerApi.getCollectionItems(String(item.collection_id));
        return {
          id: String(item.recordId), // Use recordId for direct FM operations
          uuid: String(item.collection_id), // Keep UUID for relationships/sharing
          name: item.CollectionName || 'Untitled',
          description: item.Description || '',
          createdAt: new Date(item.CreatedAt || Date.now()),
          modifiedAt: new Date(item.CreatedAt || Date.now()),
          items: (items || []).map((i: any) => ({
            recordId: String(i.collection_item_id),
            fmRecordId: String(i.fm_record_id), // Use the internal FM ID for reordering
            workId: String(i.work_id_fk), // Store as string to handle inventory numbers
            SortOrder: Number(i.SortOrder) || 0,
          })).filter((i: any) => i.workId),
        };
      }));

      setCollections(mapped);
    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshCollections();
  }, [session?.gallery_id]);

  const createCollection = async (name: string, description = '', itemIds: (number | string)[] = []): Promise<Collection | null> => {
    if (!session?.gallery_id) {
      console.error('Cannot create collection: No active gallery session');
      toast.error('Session error: No active gallery');
      return null;
    }

    try {
      const result = await filemakerApi.createCollection(name, description, session.gallery_id);
      if (result.success && result.collectionId) {
        const now = new Date();
        // Construct the object manually to avoid waiting for state refresh
        const newCollection: Collection = {
          id: String(result.recordId || result.collectionId),
          uuid: String(result.collectionId),
          name,
          description,
          createdAt: now,
          modifiedAt: now,
          items: itemIds.map(id => ({ recordId: '', fmRecordId: '', workId: id })), // Optimistic items
        };

        // If items were added, we still refresh in background to get real record IDs
        if (itemIds.length > 0) {
          await filemakerApi.addToCollection(String(result.collectionId), itemIds.map(String));
          await refreshCollections();
        } else {
          setCollections(prev => [...prev, newCollection]);
        }

        return newCollection;
      }
    } catch (error) {
      console.error('Failed to create collection:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error creating collection: ${message}`);
    }
    return null;
  };

  const updateCollection = async (id: string, updates: Partial<Omit<Collection, 'id' | 'createdAt'>>) => {
    try {
      await filemakerApi.updateCollection(id, {
        name: updates.name,
        description: updates.description
      });
      setCollections(prev => prev.map(c =>
        c.id === id ? { ...c, ...updates, modifiedAt: new Date() } : c
      ));
    } catch (error) {
      console.error('Failed to update collection:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to update collection: ${message}`);
    }
  };

  const deleteCollection = async (id: string) => {
    try {
      await filemakerApi.deleteCollection(id);
      setCollections(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete collection:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to delete collection: ${message}`);
    }
  };

  const addItemToCollection = async (collectionId: string, workId: number | string) => {
    console.log(`Attempting to add work ${workId} to collection ${collectionId}`);
    try {
      const collection = collections.find(c => c.id === collectionId);
      if (!collection) {
        console.error(`Collection ${collectionId} not found`);
        toast.error('Target collection not found');
        return;
      }

      const result = await filemakerApi.addToCollection(collection.uuid, [String(workId)]);

      if (result.success) {
        if (result.addedCount === 0) {
          toast.info('Item already exists in collection');
        } else {
          toast.success('Added to collection');
          // Refresh to get the recordId of the new item
          await refreshCollections();
        }
      } else {
        console.error('API failed to add item:', result);
        toast.error('Failed to add item to collection');
      }
    } catch (error) {
      console.error('Failed to add item to collection:', error);
      toast.error('Error adding item to collection');
    }
  };



  const addItemsToCollection = async (collectionId: string, workIds: (number | string)[]) => {
    console.log(`Attempting to add works ${workIds.join(', ')} to collection ${collectionId}`);
    try {
      const collection = collections.find(c => c.id === collectionId);
      if (!collection) {
        console.error(`Collection ${collectionId} not found`);
        toast.error('Target collection not found');
        return;
      }

      const result = await filemakerApi.addToCollection(collection.uuid, workIds.map(String));

      if (result.success) {
        if (result.addedCount === 0) {
          toast.info('All items already exist in collection');
        } else {
          toast.success(`Added ${result.addedCount} items to collection`);
          await refreshCollections();
        }
      } else {
        console.error('API failed to add items:', result);
        const message = result.failures?.[0]?.error || 'Unknown API error';
        toast.error(`Failed to add items: ${message}`);
      }
    } catch (error) {
      console.error('Failed to add items to collection:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error adding items: ${message}`);
    }
  };

  const removeItemFromCollection = async (collectionId: string, workId: number | string) => {
    try {
      await filemakerApi.removeFromCollection(collectionId, workId);
      setCollections(prev => prev.map(c => {
        if (c.id === collectionId) {
          return { ...c, items: c.items.filter(item => String(item.workId) !== String(workId)), modifiedAt: new Date() };
        }
        return c;
      }));
    } catch (error) {
      console.error('Failed to remove item from collection:', error);
    }
  };

  const reorderCollectionItems = async (collectionId: string, items: CollectionItem[]) => {
    // 1. Update local state immediately for snappy UI
    setCollections(prev => prev.map(c =>
      c.id === collectionId ? { ...c, items, modifiedAt: new Date() } : c
    ));

    // 2. Sync with FileMaker
    try {
      const collection = collections.find(c => c.id === collectionId);
      const updates = items.map((item, index) => ({
        recordId: item.fmRecordId || item.recordId, // Prioritize internal FM recordId
        SortOrder: index + 1 // 1-based index
      }));
      await filemakerApi.updateCollectionItemsOrder(updates, collection?.uuid);
    } catch (error) {
      console.error('Failed to sync collection order:', error);
      // Optional: revert local state on failure
      refreshCollections();
    }
  };

  const getCollection = (id: string) => collections.find(c => c.id === id);

  return (
    <CollectionsContext.Provider
      value={{
        collections,
        isLoading,
        createCollection,
        updateCollection,
        deleteCollection,
        addItemToCollection,
        addItemsToCollection,
        removeItemFromCollection,
        reorderCollectionItems,
        getCollection,
        refreshCollections,
      }}
    >
      {children}
    </CollectionsContext.Provider>
  );
}

export function useCollections() {
  const context = useContext(CollectionsContext);
  if (context === undefined) {
    throw new Error('useCollections must be used within a CollectionsProvider');
  }
  return context;
}
