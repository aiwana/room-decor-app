import apiClient from "./api-client";
import type { Furniture } from "@/types";

export const furnitureApi = {
  getAll: (category?: string) =>
    apiClient.get<Furniture[]>("/furniture", { params: { category } }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<Furniture>(`/furniture/${id}`).then((r) => r.data),

  search: (query: string) =>
    apiClient.get<Furniture[]>("/furniture/search", { params: { q: query } }).then((r) => r.data),
};
