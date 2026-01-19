// FileMaker Database Schema Types
// Based on studio_catalog.fmp12 database documentation
// Last updated: November 2025

// ============================================
// WORKS CATALOG - Main artwork records
// ============================================
export interface WorksCatalog {
  // Primary Key
  studio_work_inventory_no_pk: number;
  
  // Basic Info
  work_name: string;
  creation_year: number; // 1990-2080
  caption: string;
  caption_he: string; // Hebrew caption
  work_category: string;
  materials_for_caption: string;
  
  // Series & Installations
  Work_Series: string;
  Instalation_Name: string;
  Part_of_installation: string;
  Part_of_Series: string;
  
  // Dimensions
  dimensions_work_h: number;
  dimensions_work_L: number;
  dimensions_work_w: number;
  total_work_size: number; // Calculated: h * L * w
  
  // Editions
  edition_no: number; // 1-50
  No_of_APs: number; // Artist Proofs
  No_of_editions_without_AP: number; // Calculated
  Next_available_Edition_Name: string;
  No_of_sold_editions: number;
  
  // Pricing
  First_edition_price: number;
  current_edition_price: number;
  c_price_in_nis: number; // Calculated with exchange rate
  c_price_in_nis_novat: number;
  c_price_in_USD: number;
  Discount_Price: number; // Calculated
  
  // Availability
  Available_for_sale: 'yes' | null; // Calculated based on editions
  on_hold: string;
  on_hold_for: string;
  on_hold_till: string;
  quick_collection: string;
  
  // Images
  pic: string; // Container field
  img_ref: string; // Container
  Work_IMG_Path: string;
  Image_h: number;
  Image_w: number;
  hide_pic: number;
  missing_IMG: string;
  
  // Video
  video_link: string;
  video_password: string;
  video_Duration: string;
  video_quality: string;
  
  // Text Content
  Work_Text: string;
  Work_Text_HE: string;
  description_for_web: string; // Calculated
  
  // InDesign Caption Lines (Calculated)
  indd_caption_line_1: string;
  indd_caption_line_2: string;
  indd_caption_line_3: string;
  indd_caption_line_4: string;
  
  // Production Costs
  production_cost_main: number;
  production_cost_edition: number;
  production_cost_edition_arvg: number; // Calculated
  note_for_production_cost: string;
  production_Harel: string;
  
  // Documents
  document: string; // Container
  pdf_studio: string;
  file_format: string;
  
  // Collections
  collection_A: string;
  custom_order: number;
  
  // Metadata
  Record_creation_Date: Date;
  last_update: Date;
  last_update_User: string;
  other_note: string;
}

// ============================================
// EDITION CATALOG - Individual edition records
// ============================================
export interface EditionCatalog {
  // Primary Keys
  __edition_id_pk: number;
  _edition_studio_inventory_no: number; // Unique per edition
  _studio_work_inventory_no_fk: number; // Links to works_catalog
  
  // Edition Info
  edition_name: string;
  edition_price: number;
  Current_edition_price: number; // From works_catalog
  currency: string;
  exchange_rate: number;
  Category: string; // From works_catalog
  series: string; // From works_catalog
  
  // Status & Location
  Status: 'stored - Available' | 'Stored - not for sale' | 'loan' | 'sold' | string;
  not_sold_warehouse: string;
  not_sold_location_in_Storage: string;
  not_sold_crate_Name: string;
  Crate: string;
  Country_of_Origin: string; // Default: "Israel"
  
  // Frame Details
  Frame: string;
  Frame_IMG: string; // Container
  Frame_size_H: number;
  Frame_size_L: number;
  Frame_size_W: number;
  Lacquered: string;
  
  // Images
  Edition_IMG: string; // Container (750x750 thumbnail)
  work_pic: string;
  Photo: string;
  
  // Installation Link
  Installation: string; // From works_catalog
  
  // Loan Information
  Loan_Info: string;
  Loan_date: Date;
  loan_till: Date;
  loan_to: string;
  loan_where: string;
  Loan_to_Exhibition: string;
  loan_insurance: string;
  loan_shipping_info: string;
  loan_File: string; // Container
  
  // Exhibition
  Exhibition_id_fk: string;
  
  // Sale Information
  sold_date: Date;
  sold_to: string;
  sold_by: string;
  sold_price_no_vat: number;
  sold_price_inc_vat: number;
  sold_price_no_vat_nis: number;
  sold_price_inc_VAT_nis: number;
  sold_vat_percent: number;
  sold_dealer_cut_percent: number;
  sold_dealer_cut_nis: number;
  sold_studio_cut: number;
  sold_studio_cut_nis: number;
  Sold_paid: string;
  Sold_paid_Date: Date;
  Sold_paid_note: string;
  sold_delivered: string;
  sold_delivered_signature: Date;
  
  // Certificate
  sold_Certificate: string;
  Sold_certificate_IMG: string; // Container
  Sold_Certificate_Date: Date;
  Sold_Certificate_signature: string; // Container
  certificate_production: string; // Calculated
  
  // Insurance & Inventory
  not_sold_Value_of_Insurance: number;
  not_sold_Value_of_inventory: number;
  included_for_insurance: string; // Calculated
  included_for_inventory: number; // Calculated
  insurance_sum: number; // Summary
  total_inventory: number;
  
  // Shipping
  Weight: number;
  Description_Of_Goods: string; // Calculated
  
  // Quick Collection
  quick_collection: string;
  
  // Invoice
  Invoice_no: string;
  
  // Additional Info
  more_info: string;
  more_info_file: string; // Container
  more_info_tax_file: string; // Container
  Mark: string;
  Will_it_rust: string;
  Storeg_note: string;
  paymet: string;
  
  // Production
  Reimburse_studio: string;
  Reimbursement_of_production_expenses: string;
  sold_studio_Production_costs_nis: number;
  not_produced_insurance_needed_parts: number;
  
  // Metadata
  Record_creation_Date: Date;
  last_update: Date;
  last_update_user: string;
  remove_from_inventory_control: string;
  Remove_From_Shipment: string;
  
  // Work Info (from related works_catalog)
  work_name: string;
  Work_Year: number;
}

// ============================================
// SOLD EDITIONS - Sales records
// ============================================
export interface SoldEditions {
  _edition_studio_inventory_no: number;
  collector_id: string;
  
  // Edition Details
  edition_name: string;
  edition_no_and_ap: string;
  work_name: string;
  Work_Year: number;
  work_pic: string;
  
  // Caption Lines
  caption: string;
  indd_caption_line_all: string;
  indd_caption_line1: string;
  indd_caption_line2: string;
  indd_caption_line3: string;
  indd_caption_line4: string;
  missing_text: string;
  
  // Images & Links
  img_location: string;
  img_ref: string;
  web_link: string;
  web_link_qr: string;
  web_password: string;
  web_password_qr: string;
  Work_Text: string;
  
  // NFC & Stickers
  nfc_uid: string;
  sticker: string;
  
  // Certificate
  printed: string;
  ready_to_print: string;
  text_for_email: string;
  
  // AP Info
  no_of_aps: number;
  
  // Association
  piece_associated_with_a_collector: string;
  PrimaryKey: string;
  active_set: string;
  
  // Metadata
  CreatedBy: string;
  CreationTimestamp: Date;
  ModifiedBy: string;
  ModificationTimestamp: Date;
}

// ============================================
// COLLECTORS
// ============================================
export interface Collectors {
  uid: string;
  PrimaryKey: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  Phone_no: string;
  
  // Metadata
  CreatedBy: string;
  CreationTimestamp: Date;
  ModifiedBy: string;
  ModificationTimestamp: Date;
}

// ============================================
// INSTALLATIONS
// ============================================
export interface Installations {
  Installation_Name_pk: string;
  Installation_Price: number;
  Caption: string;
  Caption_he: string;
  Text: string;
  More_info: string;
  IMG: string; // Container
  Add_File: string; // Container
  
  // Metadata
  CreatedBy: string;
  ModifiedBy: string;
  ModificationTimestamp: Date;
}

// ============================================
// SERIES
// ============================================
export interface Series {
  Series_Name: string;
  More_Info: string;
  Add_File: string; // Container
  
  // Metadata
  CreatedBy: string;
  CreationTimestamp: Date;
  ModifiedBy: string;
  ModificationTimestamp: Date;
}

// ============================================
// EXHIBITIONS
// ============================================
export interface Exhibitions {
  PrimaryKey: string;
  // Additional fields from database relations
}

// ============================================
// CRATES
// ============================================
export interface Crates {
  Crate_Name: string;
  Shipment_id_fk: string;
  warehouse: string;
  Location_in_the_storage: string;
  Empty: string;
  External_crate_no: string;
  Status: string;
  
  // Dimensions
  Size_H: number;
  Size_L: number;
  Size_W: number;
  Weight: number;
  
  // Frame
  Aluminum_frame: string;
  Crate_Image: string; // Container
  S_no: string;
  Shipment_Name: string;
  More_Infom: string;
  
  // Metadata
  CreatedBy: string;
  CreationTimestamp: Date;
  ModifiedBy: string;
  ModificationTimestamp: Date;
}

// ============================================
// WAREHOUSES
// ============================================
export interface Warehouse {
  warehouse_Name: string;
  PrimaryKey: string;
  
  // Metadata
  CreatedBy: string;
  CreationTimestamp: Date;
  ModifiedBy: string;
  ModificationTimestamp: Date;
}

// ============================================
// LOCATION IN STORAGE
// ============================================
export interface LocationInStorage {
  warehouse: string;
  Location_in_Storage: string;
  PrimaryKey: string;
  
  // Metadata
  CreatedBy: string;
  CreationTimestamp: Date;
  ModifiedBy: string;
  ModificationTimestamp: Date;
}

// ============================================
// ITEMS IN INSTALLATIONS
// ============================================
export interface ItemsInInstallations {
  installation_Name: string;
  ASSET_ID_MATCH_FIELD: string;
  Item: string;
  Category: string;
  collection_A: string;
  Country_of_Origin: string;
  Description_Of_Goods: string;
  
  // Storage & Crate
  Crate: string;
  crate_temp: string;
  Crate_Name: string;
  in_storage: string;
  Location_in_Storage: string;
  warehouse: string;
  
  // Dimensions
  Size_H: number;
  Size_L: number;
  Size_W: number;
  Weight: number;
  No_of_items: number;
  no_of_items_for_shipping: number;
  
  // Images
  Image_Container: string;
  
  // Loan Info
  Loan_date: Date;
  loan_till: Date;
  loan_to: string;
  loan_where: string;
  loan_insurance: string;
  loan_shipping_info: string;
  loan_File: string;
  
  // Exhibition
  Exhibition_id_fk: string;
  
  // Value
  Value_for_insurance: number;
  Total_Value: number;
  Status: string;
  Notes: string;
  
  // Count
  Count: number;
  
  // Metadata
  Date_Created: Date;
  Date_Modified: Date;
  modified_By: string;
  Add_File: string;
}

// ============================================
// SHIPMENTS
// ============================================
export interface Shipments {
  PrimaryKey: string;
  Shipment_Name: string;
  
  // From Location
  Shipment_From: string;
  Shipment_From_Address: string;
  Shipment_From_Contact_Name: string;
  Shipment_From_Contact_Email: string;
  Shipment_From_Contact_Phone: string;
  Shipment_From_Tax_id: string;
  
  // To Location
  Shipment_To: string;
  Shipment_To_Address: string;
  Shipment_To_Contact_Name: string;
  Shipment_To_Contact_Email: string;
  Shipment_To_Contact_Phone: string;
  
  // Dates
  Shipment_In_Date: Date;
  Shipment_Out_Date: Date;
  
  // Company
  Shipment_company: string;
  Shipment_company_Contact_Name: string;
  Shipment_company_Contact_Email: string;
  Shipment_company_Contact_Phone: string;
  
  // Details
  Shipment_Insurance: string;
  Shipment_Invoice_No: string;
  Shipment_Exhibition: string;
  Sold_To: string;
  Reason_for_Export: string;
  
  // Files
  Add_File: string;
  Invoice: string;
  Invoce_Text: string;
  Export_file: string;
  packing_list_file: string;
  More_Info: string;
  
  // Metadata
  CreatedBy: string;
  CreationTimestamp: Date;
  ModifiedBy: string;
  ModificationTimestamp: Date;
}

// ============================================
// GENERAL CONTROL - Global settings
// ============================================
export interface GeneralControl {
  connect: string;
  
  // Currency Exchange Rates
  Currency_Conversion: string;
  Currency_Exchange_rate: number;
  EURO_to_NIS_exchange_rate: number;
  EURO_to_USD_exchange_rate: number;
  
  // Discount
  Discount_percentage: number;
  
  // Print Layout Settings
  Works_Print_Layout_Price_euro: string;
  Works_Print_Layout_Price_USD: string;
  Works_Print_Layout_Price_nis: string;
}

// ============================================
// API Response Types for FileMaker Data API
// ============================================
export interface FileMakerRecord<T> {
  recordId: string;
  modId: string;
  fieldData: T;
  portalData?: Record<string, unknown[]>;
}

export interface FileMakerResponse<T> {
  response: {
    dataInfo?: {
      database: string;
      layout: string;
      table: string;
      totalRecordCount: number;
      foundCount: number;
      returnedCount: number;
    };
    data?: FileMakerRecord<T>[];
  };
  messages: Array<{
    code: string;
    message: string;
  }>;
}

// ============================================
// Search/Filter Types for Gallery View
// ============================================
export interface WorksSearchParams {
  work_name?: string;
  work_category?: string;
  Work_Series?: string;
  creation_year_from?: number;
  creation_year_to?: number;
  Available_for_sale?: boolean;
  quick_collection?: string;
  dimensions_min?: number;
  dimensions_max?: number;
  price_min?: number;
  price_max?: number;
}

export interface EditionSearchParams {
  _studio_work_inventory_no_fk?: number;
  Status?: string;
  warehouse?: string;
  quick_collection?: string;
}

// ============================================
// Quick Collection Type
// ============================================
export interface QuickCollection {
  id: string;
  name: string;
  created_at: Date;
  works: number[]; // studio_work_inventory_no_pk[]
  editions: number[]; // _edition_studio_inventory_no[]
  shared_link?: string;
  expires_at?: Date;
}
