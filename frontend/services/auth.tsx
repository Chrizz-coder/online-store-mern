import { request } from "@/services/api";
import type { AuthResponse, LoginInput, RegisterInput } from "@/types/auth";

export async function login(input: LoginInput): Promise<AuthResponse> {
  return request<AuthResponse>("/api/user/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  return request<AuthResponse>("/api/user/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export async function getProfile(token: string) {
  return request("/api/user/profile", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
