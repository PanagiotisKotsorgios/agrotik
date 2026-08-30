/**
 * Domain types. When Supabase is running you can regenerate the full
 * database.types.ts with `npm run db:types`. These are the hand-written
 * types the app uses at the domain boundary.
 */

export type UserRole = "farmer" | "merchant" | "factory" | "admin";
export type ProductStatus = "active" | "pending" | "rejected";
export type NotificationKind = "price_changed";

export interface GalleryItem {
  url: string;
  alt?: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  phone: string;
  region_code: string;
  municipality: string | null;
  avatar_path: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  gallery: GalleryItem[];
  extras: Record<string, string | number | boolean>;
  bio: string | null;
  website: string | null;
  vat_number: string | null;
  year_founded: number | null;
  employees_range: string | null;
  certifications: string | null;
  specialties: string | null;
  opening_hours: string | null;
  address_line: string | null;
  is_public: boolean;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Region {
  code: string;
  name_el: string;
}

export type AttributesSchema = Record<
  string,
  | { type: "enum"; label: string; values: string[] }
  | { type: "number"; label: string; unit?: string }
  | { type: "text"; label: string }
>;

export interface Product {
  id: string;
  slug: string;
  name_el: string;
  category: string;
  unit: string;
  attributes_schema: AttributesSchema;
  status: ProductStatus;
  proposed_by: string | null;
  created_at: string;
}

export interface PriceVariant {
  attributes: Record<string, string | number>;
  price: number;
  currency: "EUR";
}

export type PriceListKind =
  | "buy_from_producer"
  | "buy_from_merchant"
  | "sell_wholesale"
  | "sell_retail";

export interface PriceListing {
  id: string;
  owner_id: string;
  product_id: string;
  kind: PriceListKind;
  title: string | null;
  variants: PriceVariant[];
  region_code: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const PRICE_LIST_KIND_LABEL: Record<PriceListKind, string> = {
  buy_from_producer: "Αγοράζω από παραγωγό",
  buy_from_merchant: "Αγοράζω από έμπορο",
  sell_wholesale: "Πουλάω χονδρικής",
  sell_retail: "Πουλάω λιανικής",
};

export const PRICE_LIST_KIND_HELP: Record<PriceListKind, string> = {
  buy_from_producer: "Τιμές αγοράς για αγρότες. Εμφανίζεται στο «Βρες Αγοραστή».",
  buy_from_merchant: "Τιμές αγοράς για εμπόρους/μεσίτες. Εμφανίζεται σε εμπόρους.",
  sell_wholesale: "Τιμές χονδρικής πώλησης προς άλλους αγοραστές.",
  sell_retail: "Τιμές λιανικής — ορατές δημόσια σε όλους.",
};

export interface ProductionListing {
  id: string;
  owner_id: string;
  product_id: string;
  attributes: Record<string, string | number>;
  quantity: number;
  unit: string | null;
  region_code: string;
  available_from: string | null;
  available_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  user_id: string;
  target_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  kind: NotificationKind;
  payload: {
    listing_id: string;
    target_profile_id: string;
    product_id: string;
    changed_variants: Array<{
      attributes: Record<string, string | number>;
      old_price: number;
      new_price: number;
    }>;
  };
  read_at: string | null;
  created_at: string;
}
