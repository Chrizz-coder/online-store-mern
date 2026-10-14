import { request } from "@/services/api";
import type { ProductsResponse } from "@/types/products";

export function getProducts(): Promise<ProductsResponse> {
  return request<ProductsResponse>("/api/products");
}
