import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface QuickCollectionContextType {
  items: number[]; // Array of work_ids
  addItem: (workId: number) => void;
  removeItem: (workId: number) => void;
  toggleItem: (workId: number) => void;
  hasItem: (workId: number) => boolean;
  clearAll: () => void;
  count: number;
}

const QuickCollectionContext = createContext<QuickCollectionContextType | undefined>(undefined);

const STORAGE_KEY = 'quick_collection';

export function QuickCollectionProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<number[]>([]);
  const { isAuthenticated } = useAuth();

  // Reset collections when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
    }
  }, [isAuthenticated]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      console.warn('Could not load Quick Collection from storage');
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      console.warn('Could not save Quick Collection to storage');
    }
  }, [items]);

  const addItem = (workId: number) => {
    setItems((prev) => (prev.includes(workId) ? prev : [...prev, workId]));
  };

  const removeItem = (workId: number) => {
    setItems((prev) => prev.filter((id) => id !== workId));
  };

  const toggleItem = (workId: number) => {
    setItems((prev) =>
      prev.includes(workId) ? prev.filter((id) => id !== workId) : [...prev, workId]
    );
  };

  const hasItem = (workId: number) => items.includes(workId);

  const clearAll = () => {
    setItems([]);
  };

  return (
    <QuickCollectionContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        toggleItem,
        hasItem,
        clearAll,
        count: items.length,
      }}
    >
      {children}
    </QuickCollectionContext.Provider>
  );
}

export function useQuickCollection() {
  const context = useContext(QuickCollectionContext);
  if (context === undefined) {
    throw new Error('useQuickCollection must be used within a QuickCollectionProvider');
  }
  return context;
}
