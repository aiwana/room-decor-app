import apiClient from "./api-client";
import * as FileSystem from "expo-file-system";
import type { RoomImage } from "@/types";

export const roomImageApi = {
  getAll: () =>
    apiClient.get<RoomImage[]>("/room-images").then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<RoomImage>(`/room-images/${id}`).then((r) => r.data),

  upload: async (uri: string): Promise<RoomImage> => {
    const formData = new FormData();
    formData.append("file", {
      uri,
      name: "room.jpg",
      type: "image/jpeg",
    } as any);

    const res = await apiClient.post<RoomImage>("/room-images/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  delete: (id: string) =>
    apiClient.delete(`/room-images/${id}`),
};
