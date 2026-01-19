// Gallery Access System Types

export interface Gallery {
  gallery_id: string;
  GalleryName: string;
  ContactPerson: string;
  Email: string;
  Phone: string;
  Username: string;
  Notes: string;
  CreatedAt: Date;
  ModifiedAt: Date;
}

export interface GallerySession {
  gallery_id: string;
  galleryName: string;
  token: string;
  expiresAt: Date;
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
  hold_status?: 'available' | 'on_hold_by_me' | 'on_hold_by_other';
  hold_info?: {
    gallery_name: string;
    expires_at: Date;
  };
  produced_edition?: string | null;
}

export interface ArtworkWithImages extends Artwork {
  images: string[];
  thumbnails: string[];
}

export interface Collection {
  collection_id: string;
  gallery_id_fk: string;
  CollectionName: string;
  Description: string;
  IsActive: boolean;
  CreatedAt: Date;
  ModifiedAt: Date;
  itemCount?: number;
}

export interface CollectionItem {
  collection_item_id: string;
  collection_id_fk: string;
  work_id_fk: number;
  SortOrder: number;
  AddedAt: Date;
}

export interface Hold {
  hold_id: string;
  gallery_id_fk: string;
  work_id_fk: number;
  StartDate: Date;
  ExpirationDate: Date;
  Active: boolean;
}

export interface GuestViewToken {
  token: string;
  collection_id_fk: string;
  gallery_id_fk: string;
  CreatedAt: Date;
  ExpiresAt: Date;
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
  ids?: string[];
  excludeTitle?: boolean;
  excludeCategory?: boolean;
  excludeSeries?: boolean;
  excludeMaterials?: boolean;
  loanedToMyGallery?: boolean;
  status?: string;
  loan_to?: string;
}

export type HoldStatus =
  | 'available'
  | 'on_hold_by_me'
  | 'on_hold_by_other'
  | 'not_available';
