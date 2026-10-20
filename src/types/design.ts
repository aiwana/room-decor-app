/**
 * src/types/design.ts
 * Type cho chuc nang chinh: AI Decor / Result / History.
 * Thiet ke san cho AI THAT (co status 'processing' | 'failed'),
 * du hien tai mock luon tra 'done'.
 */
import type { IoniconName } from './common';

export type RoomTypeId = 'living' | 'bedroom' | 'kitchen' | 'office' | 'bathroom';

export type DesignStyleId =
  | 'modern'
  | 'minimalist'
  | 'japandi'
  | 'scandinavian'
  | 'luxury'
  | 'industrial';

export type ColorThemeId = 'white' | 'beige' | 'gray' | 'brown' | 'green' | 'black';

export interface RoomTypeOption {
  id: RoomTypeId;
  label: string;
  iconName: IoniconName;
}

export interface DesignStyleOption {
  id: DesignStyleId;
  label: string;
  description: string;
  imageUrl: string;
}

export interface ColorThemeOption {
  id: ColorThemeId;
  label: string;
  hex: string;
}

/** Trang thai xu ly cua AI (AI that thuong mat 10-60 giay) */
export type DesignStatus = 'processing' | 'done' | 'failed';

/** 1 vat lieu/san pham duoc dung trong thiet ke (noi voi module Catalog) */
export interface DesignProduct {
  productId: string;
  /** Vi tri su dung, vd 'Sàn', 'Tường', 'Sofa' */
  usage: string;
}

/** Du lieu dau vao khi bam "Thiet ke bang AI" */
export interface GenerateDesignInput {
  imageUri: string;
  roomType: RoomTypeId;
  style: DesignStyleId;
  colorTheme?: ColorThemeId;
  /** Ghi chu them cho AI (mock bo qua, AI that se dung) */
  prompt?: string;
}

/** 1 thiet ke do AI tao ra */
export interface Design {
  id: string;
  createdAt: string; // ISO string
  originalImageUri: string; // anh TRUOC (anh nguoi dung chup/chon)
  resultImageUrl: string; // anh SAU (AI tra ve)
  roomType: RoomTypeId;
  style: DesignStyleId;
  colorTheme?: ColorThemeId;
  prompt?: string;
  status: DesignStatus;
  errorMessage?: string;
  products: DesignProduct[];
  isFavorite: boolean;
}
