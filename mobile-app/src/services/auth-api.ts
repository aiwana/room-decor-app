import apiClient from "./api-client";
import type { AuthResponse, User } from "@/types";

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>("/auth/login", { email, password }).then((r) => r.data),

  register: (name: string, email: string, password: string) =>
    apiClient.post<AuthResponse>("/auth/register", { name, email, password }).then((r) => r.data),

  getProfile: () =>
    apiClient.get<User>("/users/me").then((r) => r.data),
};
