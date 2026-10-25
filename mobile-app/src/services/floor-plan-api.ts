import apiClient from "./api-client";
import type { FloorPlan, Wall } from "@/types";

export const floorPlanApi = {
  getByRoomImage: (roomImageId: string) =>
    apiClient.get<FloorPlan>(`/floor-plans/by-room-image/${roomImageId}`).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<FloorPlan>(`/floor-plans/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<{
    roomWidth: number;
    roomDepth: number;
    ceilingHeight: number;
    walls: Wall[];
    pixelsPerMeter: number;
  }>) =>
    apiClient.put<FloorPlan>(`/floor-plans/${id}`, data).then((r) => r.data),
};
