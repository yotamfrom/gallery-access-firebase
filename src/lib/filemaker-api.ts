// FileMaker Data API Integration via Firebase Cloud Functions
import { auth } from './firebase';
import { Collection } from '@/types/gallery';

export interface FileMakerConfig {
  host: string;
  database: string;
  username: string;
  password: string;
  layouts: LayoutConfig;
}

export interface LayoutConfig {
  works: string;
  gallery: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  galleryId?: string;
  galleryName?: string;
  error?: string;
}

export interface ApiTestResult {
  endpoint: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  responseTime?: number;
  version?: string;
  logs?: string[];
  details?: string;
  diagnostics?: any;
}

export interface Artwork {
  work_id: number | string;
  work_name: string;
  creation_year: number | null;
  work_category: string | null;
  work_series: string | null;
  materials: string | null;
  dimensions_h: number | null;
  dimensions_w: number | null;
  dimensions_l: number | null;
  dimensions: string | null;
  current_edition_price: number | null;
  available_for_sale: boolean;
  image_url: string | null;
  image_location: string | null;
  thumbnail_url: string | null;
  // Caption lines for display
  indd_caption_line_1: string | null;
  indd_caption_line_2: string | null;
  indd_caption_line_3: string | null;
  edition_info: string | null;
  work_text: string | null;
  // Loan/hold status
  is_on_loan_to_gallery?: boolean;
  loan_info?: {
    loaned_to: string;
    location: string;
  };
  produced_edition?: string | null;
}

export interface SearchFilters {
  title?: string;
  yearFrom?: number;
  yearTo?: number;
  category?: string;
  series?: string;
  materials?: string;
  dimensionHMin?: number;
  dimensionHMax?: number;
  dimensionWMin?: number;
  dimensionWMax?: number;
  dimensionLMin?: number;
  dimensionLMax?: number;
  priceMin?: number;
  priceMax?: number;
  loanedToMyGallery?: boolean;
  ids?: string[];
  excludeTitle?: boolean;
  excludeCategory?: boolean;
  excludeSeries?: boolean;
  excludeMaterials?: boolean;
  // Custom API fields for loan query
  status?: string;
  loan_to?: string;
}

const REGION = 'europe-west3';

// FileMaker API client using Firebase Cloud Functions
export class FileMakerAPI {
  private config: FileMakerConfig | null = null;
  private galleryId: string | null = null;

  constructor() {
    const saved = localStorage.getItem('gallery_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.galleryId = parsed.galleryId || null;
      } catch (e) { }
    }
  }

  setGalleryId(id: string | null) {
    this.galleryId = id;
  }

  setConfig(config: FileMakerConfig) {
    this.config = config;
  }

  getConfig(): FileMakerConfig | null {
    return this.config;
  }

  isConfigured(): boolean {
    return true;
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    return this.fetchApi('login', { username, password });
  }

  async verify2FA(email: string, token: string): Promise<{ success: boolean; error?: string }> {
    return this.fetchApi('verify2FA', { email, token });
  }

  async getArtworks(filters?: SearchFilters, limit = 25, offset = 0): Promise<{ artworks: Artwork[]; totalCount: number; debugError?: string; debugQuery?: string }> {
    return this.fetchApi('getArtworks', { filters, limit, offset });
  }

  async getFilterOptions(): Promise<{ categories: string[]; series: string[] }> {
    return this.fetchApi('getFilterOptions', {});
  }

  async getArtwork(workId: string | number): Promise<Artwork | null> {
    const result = await this.fetchApi('getArtwork', { id: workId });
    return result.artwork || null;
  }

  async createCollection(name: string, description: string, galleryId: string): Promise<{ success: boolean; recordId?: string; collectionId?: string }> {
    return this.fetchApi('createCollection', { name, description, galleryId });
  }

  async addToCollection(collectionId: string, artworkIds: string[]): Promise<{ success: boolean; addedCount?: number; failures?: any[] }> {
    return this.fetchApi('addToCollection', { collectionId, artworkIds });
  }

  async removeFromCollection(collectionId: string, workId: string | number): Promise<{ success: boolean }> {
    return this.fetchApi('removeFromCollection', { collectionId, workId });
  }

  async updateCollection(collectionId: string, updates: { name?: string; description?: string }): Promise<{ success: boolean }> {
    return this.fetchApi('updateCollection', { collectionId, updates });
  }

  async deleteCollection(collectionId: string): Promise<{ success: boolean }> {
    return this.fetchApi('deleteCollection', { collectionId });
  }

  async getCollections(galleryId: string): Promise<any[]> {
    return this.fetchApi('getCollections', { galleryId });
  }

  async getCollectionItems(collectionId: string): Promise<any[]> {
    return this.fetchApi('getCollectionItems', { collectionId });
  }

  async getLayoutMetadata(layout: string): Promise<any> {
    return this.fetchApi('getLayoutMetadata', { layout });
  }

  async updateCollectionItemsOrder(items: { recordId: string; SortOrder: number }[], collectionId?: string) {
    return this.fetchApi('updateCollectionItemsOrder', { items, collectionId });
  }

  async getSystemConfigs(): Promise<any[]> {
    return this.fetchApi('getSystemConfigs', {});
  }

  async updateSystemConfigs(configs: { key: string; value: string }[], twoFactorToken?: string, email?: string): Promise<{ success: boolean; error?: string }> {
    return this.fetchApi('updateSystemConfigs', { configs, twoFactorToken, email });
  }

  async createShareLink(collectionId: string): Promise<{ shareToken: string }> {
    return this.fetchApi('createShareLink', { collectionId });
  }

  async forceRepairIdentity(galleryId: string, galleryName: string): Promise<any> {
    return this.fetchApi('forceRepairIdentity', { galleryId, galleryName });
  }

  async getSharedCollection(shareToken: string): Promise<any> {
    return this.fetchApi('getSharedCollection', { shareToken });
  }

  async syncGalleries(): Promise<{ success: boolean; count: number; galleries: any[] }> {
    return this.fetchApi('syncGalleries');
  }

  async diagnostics(): Promise<any> {
    return this.fetchApi('diagnostics', {});
  }

  async fixStorageCors(): Promise<any> {
    return this.fetchApi('fixStorageCors', {});
  }

  async fetchApi(action: string, body: any = {}): Promise<any> {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const baseUrl = `https://${REGION}-${projectId}.cloudfunctions.net/filemakerApi`;

    try {
      const idToken = await auth?.currentUser?.getIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action,
          body: {
            ...body,
            galleryId: body.galleryId || this.galleryId
          }
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.statusText}`);
      }
      return data;
    } catch (error) {
      console.error(`API Error (${action}):`, error);
      throw error;
    }
  }

  async testConnection(): Promise<ApiTestResult> {
    const startTime = Date.now();
    try {
      const result = await this.fetchApi('testConnection', {});
      const responseTime = Date.now() - startTime;

      return {
        endpoint: 'Firebase Cloud Function',
        status: result.success ? 'success' : 'error',
        message: result.message || (result.success ? 'Connected successfully' : 'Connection failed'),
        responseTime,
        logs: result.logs,
      };
    } catch (err: any) {
      return {
        endpoint: 'Firebase Cloud Function',
        status: 'error',
        message: err.message || 'Failed to connect',
        responseTime: Date.now() - startTime,
      };
    }
  }
}

// Default configuration - SECRETS REMOVED
const DEFAULT_CONFIG: FileMakerConfig = {
  host: '',
  database: '',
  username: '',
  password: '',
  layouts: {
    works: 'Work Info',
    gallery: 'Galleries',
  },
};

// Singleton instance
export const filemakerApi = new FileMakerAPI();
filemakerApi.setConfig(DEFAULT_CONFIG);
