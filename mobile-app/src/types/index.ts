// Shared types

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Furniture {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  depth: number;
  modelUrl?: string;
  thumbnailUrl?: string;
}

export interface Design {
  id: string;
  name: string;
  roomImageId: string;
  furniturePlacements: FurniturePlacement[];
  createdAt: string;
  updatedAt: string;
}

export interface FurniturePlacement {
  id: string;
  furnitureId: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export interface RoomImage {
  id: string;
  url: string;
  width: number;
  height: number;
  capturedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
