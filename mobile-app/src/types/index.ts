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

/** FurnitureDto. Kich thuoc tinh bang cm. */
export interface Furniture {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  depth: number;
  modelUrl?: string | null;
  thumbnailUrl?: string | null;
}

/**
 * PlacementDto: 1 mon do dat tren anh phong (trinh chinh sua 2D).
 *   x, y     : vi tri TAM mon do, tinh theo ti le 0..1 cua khung anh phong
 *              (0,0 = goc tren trai, 1,1 = goc duoi phai) -> khong phu thuoc kich thuoc man hinh
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

/** AiSuggestionResponse */
export interface AiSuggestion {
  placements: FurniturePlacement[];
  description: string;
}

/* ============================ Frontend ============================ */

/**
 * Thiet ke + du lieu luu tren may:
 *  - roomImageUri: anh phong tren may (backend chua phuc vu file anh)
 *  - placements  : vi tri do (backend chua co API luu)
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
