import apiClient from "./api-client";
import type { Design } from "@/types";

export const designApi = {
  getAll: () =>
    apiClient.get<Design[]>("/designs").then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<Design>(`/designs/${id}`).then((r) => r.data),

  create: (data: Pick<Design, "name" | "roomImageId">) =>
    apiClient.post<Design>("/designs", data).then((r) => r.data),

  update: (id: string, data: Partial<Design>) =>
    apiClient.put<Design>(`/designs/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/designs/${id}`),
};
