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
  placements: FurniturePlacement[];
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

export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface FloorPlan {
  id: string;
  roomImageId: string;
  roomWidth: number; // meters
  roomDepth: number; // meters
  ceilingHeight: number; // meters
  walls: Wall[];
  pixelsPerMeter: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScanResult {
  floorPlan: FloorPlan;
  description: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
