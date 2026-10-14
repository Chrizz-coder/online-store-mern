import type { Product } from "@/types/products";

export type WishlistItem = {
  product: string | Product;
  addedAt?: string;
};

export type Wishlist = {
  _id: string;
  user: string;
  items: WishlistItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type GetWishlistResponse =
  | {
      count: number;
      wishlist: Wishlist;
    }
  | {
      items: [];
    };

export type WishlistMutationResponse = {
  message: string;
  wishlist: Wishlist;
};
