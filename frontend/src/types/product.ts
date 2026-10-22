export type UnitType = 'un' | 'kg' | 'L' | 'pct' | 'cx';

export interface Product {
  id: string;
  barcode?: string | null;
  name: string;
  brand?: string | null;
  categoryName: string;
  currentQuantity: number;
  minQuantity: number;
  idealQuantity: number;
  unit: UnitType;
}

export interface ProductInput {
  id?: string;
  barcode?: string | null;
  name: string;
  brand?: string | null;
  categoryName: string;
  currentQuantity: number;
  minQuantity: number;
  idealQuantity: number;
  unit: UnitType;
}
