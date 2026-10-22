import apiClient from "./api-client";
import type { FurniturePlacement } from "@/types";

export interface AiSuggestionRequest {
  roomImageId: string;
  style?: string;
}

export interface AiSuggestionResponse {
  placements: FurniturePlacement[];
  description: string;
}

export const aiApi = {
  suggestLayout: (data: AiSuggestionRequest) =>
    apiClient.post<AiSuggestionResponse>("/ai/suggest-layout", data).then((r) => r.data),

  describeRoom: (roomImageId: string) =>
    apiClient.post<{ description: string }>(`/ai/describe-room/${roomImageId}`).then((r) => r.data),
};
