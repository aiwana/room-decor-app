import apiClient from "./api-client";
import type { Design, FurniturePlacement } from "@/types";

/** Request body cho PUT /designs/{id} - khớp với backend UpdateDesignRequest */
export interface UpdateDesignRequest {
  name?: string;
  placements?: {
    id: string;
    furnitureId: string;
    x: number;
    y: number;
    rotation: number;
    scale: number;
  }[];
}

export const designApi = {
  getAll: () =>
    apiClient.get<Design[]>("/designs").then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<Design>(`/designs/${id}`).then((r) => r.data),

  create: (data: Pick<Design, "name" | "roomImageId">) =>
    apiClient.post<Design>("/designs", data).then((r) => r.data),

  update: (id: string, data: UpdateDesignRequest) =>
    apiClient.put<Design>(`/designs/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/designs/${id}`),

  savePlacements: (id: string, placements: FurniturePlacement[]) =>
    apiClient.put<Design>(`/designs/${id}`, { placements }).then((r) => r.data),
};
