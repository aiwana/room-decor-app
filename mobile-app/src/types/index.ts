/**
 * src/types/index.ts
 * Kieu du lieu dung chung. Cac kieu "API" khop voi DTO cua backend Spring Boot
 * (backend/src/main/java/com/roomdecor/dto). Id la UUID dang chuoi.
 */
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';

/** Ten icon hop le cua Ionicons */
export type IoniconName = ComponentProps<typeof Ionicons>['name'];

/* ============================ API (backend) ============================ */

export type Role = 'USER' | 'ADMIN';

/** UserDto */
export interface User {
  id: string;
  name: string;
  email: string;
  /** Co tu nhanh feature/auth-security; ban cu cua backend co the chua tra ve */
  role?: Role;
}

/** AuthResponse */
export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

/** FurnitureDto. Kich thuoc tinh bang cm, gia tinh bang VND. */
export interface Furniture {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  depth: number;
  modelUrl?: string | null;
  thumbnailUrl?: string | null;
  vendorId?: string | null;
  vendorName?: string | null;
  price?: number | null;
  currency?: string | null;
  style?: string | null;
  material?: string | null;
  stockStatus?: string | null;
}

export type MaterialKind = 'floor' | 'wall' | 'skirting';

/** MaterialDto: vat lieu san/tuong/len chan tuong, gia tham khao. */
export interface Material {
  id: string;
  vendorId?: string | null;
  vendorName?: string | null;
  code: string;
  name: string;
  kind: MaterialKind;
  style?: string | null;
  colorHex?: string | null;
  tileWidthCm?: number | null;
  tileHeightCm?: number | null;
  price?: number | null;
  priceUnit?: 'm2' | 'md' | 'piece' | string;
  coverageM2PerBox?: number | null;
  textureUrl?: string | null;
  textureLicense?: string | null;
  sourceUrl?: string | null;
  isSample?: boolean;
}

/**
 * PlacementDto: 1 mon do dat trong phong (trinh chinh sua).
 *   x, y     : vi tri TAM mon do, tinh theo ti le 0..1 cua khung anh phong
 *              (0,0 = goc tren trai, 1,1 = goc duoi phai) -> khong phu thuoc kich thuoc man hinh.
 *              Tren mat bang 2D / 3D: x * roomWidth, y * roomDepth (met).
 *   rotation : goc xoay, don vi do (do), chieu kim dong ho
 *   scale    : ti le phong to (1 = kich thuoc mac dinh)
 */
export interface FurniturePlacement {
  id: string;
  furnitureId: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

/** DesignDto */
export interface Design {
  id: string;
  name: string;
  roomImageId: string | null;
  /** Ma vat lieu san/tuong/len chan tuong, xem src/constants/materials.ts */
  floorMaterial?: string | null;
  wallMaterial?: string | null;
  skirtingMaterial?: string | null;
  placements: FurniturePlacement[];
  /** Co the null ngay sau khi tao (backend chua dien) */
  createdAt: string | null;
  updatedAt: string | null;
}

/** RoomImage (POST /api/room-images/upload) */
export interface RoomImage {
  id: string;
  url: string;
  width: number;
  height: number;
  capturedAt: string;
}

/** WallDto: 1 doan tuong tren mat bang, toa do met (goc tren trai = 0,0) */
export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * FloorPlanDto: mat bang 2D cua 1 anh phong, do AI quet ra (POST /api/ai/scan-room).
 * Kich thuoc tinh bang MET. Moi anh phong co toi da 1 mat bang.
 */
export interface FloorPlan {
  id: string;
  roomImageId: string;
  roomWidth: number;
  roomDepth: number;
  ceilingHeight: number;
  walls: Wall[];
  pixelsPerMeter: number;
  description?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/** ScanRoomResponse */
export interface ScanResult {
  floorPlan: FloorPlan;
  description: string;
}

/** AiSuggestionResponse */
export interface AiSuggestion {
  placements: FurniturePlacement[];
  description: string;
}

/* ============================ Frontend ============================ */

/**
 * Thiet ke + du lieu luu tren may:
 *  - roomImageUri: anh phong tren may (hien nhanh, khong can tai lai tu may chu)
 *  - placements  : vi tri do (luu tren may va gui len PUT /api/designs/{id})
 */
export interface DesignDetail extends Design {
  createdAt: string;
  updatedAt: string;
  roomImageUri: string | null;
}

/** Nut tat tren Home */
export interface QuickAction {
  id: string;
  label: string;
  iconName: IoniconName;
  href: Href;
}

export interface FurnitureCategory {
  id: string;
  label: string;
  iconName: IoniconName;
}

export interface Inspiration {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
}
