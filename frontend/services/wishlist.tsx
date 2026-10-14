import { getAuthHeaders, request } from "@/services/api";
import type {
  GetWishlistResponse,
  WishlistMutationResponse,
} from "@/types/wishlist";

export function getWishlist(): Promise<GetWishlistResponse> {
  return request<GetWishlistResponse>("/api/wishlist", {
    headers: getAuthHeaders(),
  });
}

export function addToWishlist(
  productId: string,
): Promise<WishlistMutationResponse> {
  return request<WishlistMutationResponse>("/api/wishlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ productId }),
  });
}

export function removeFromWishlist(
  productId: string,
): Promise<WishlistMutationResponse> {
  return request<WishlistMutationResponse>("/api/wishlist", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ productId }),
  });
}
