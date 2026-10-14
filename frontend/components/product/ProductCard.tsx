"use client";
import { type Product } from "@/types/products";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
} from "@/services/wishlist";

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [isWishListed, setIsWishListed] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError] = useState("");
  const currentPrice = product.salePrice ?? product.basePrice;
  const hasDiscount =
    product.salePrice !== undefined && product.salePrice < product.basePrice;

  const handleWishlistClick = async () => {
    if (isAuthLoading || isWishlistLoading) {
      return;
    }
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    setIsWishlistLoading(true);
    setWishlistError("");

    try {
      if (isWishListed) {
        await removeFromWishlist(product._id);
        setIsWishListed(false);
      } else {
        await addToWishlist(product._id);
        setIsWishListed(true);
      }
    } catch (error) {
      setWishlistError(
        error instanceof Error ? error.message : "Unable to update wishlist.",
      );
    } finally {
      setIsWishlistLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadWishlist = async () => {
      try {
        const result = await getWishlist();

        if ("wishlist" in result) {
          const exists = result.wishlist.items.some((item) => {
            const productId =
              typeof item.product === "string"
                ? item.product
                : item.product._id;

            return productId === product._id;
          });

          setIsWishListed(exists);
        }
      } catch (error) {
        console.log("Failed to load wishlist", error);
      }
    };
    loadWishlist();
  }, [isAuthenticated, product._id]);
  const colors = [
    ...new Set(
      product.variants
        ?.map((v: any) => v.color)
        .filter((c: any): c is string => Boolean(c)) || [],
    ),
  ];

  if (isAuthLoading) {
    return null;
  }
  console.log("Product:", product);
  console.log("Product ID:", product._id);
  return (
    
    <article className="group flex flex-col w-full h-full bg-white  select-none text-left">
      <div className="relative overflow-hidden aspect-square w-full bg-[#f6f6f6] rounded-sm">
        <img
          src={product.images?.[0] || "/image.png"}
          alt={product.name}
          loading="lazy"
          className="object-contain h-full w-full transition-transform duration-300 ease-out group-hover:scale-103"
        />
        <button
          type="button"
          onClick={handleWishlistClick}
          disabled={isWishlistLoading}
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-white/90 text-xl shadow-sm hover:bg-white transition-transform active:scale-90 focus:outline-none "
        >
          {isWishListed ? "❤️" : "🤍"}
        </button>
      </div>
      <div className="flex flex-col grow space-y-1 pt-4 text-left ">
        <h2 className="font-medium text-neutral-900 text-[16px]tracking-tight">
          {product.name}
        </h2>
        <p className="text-sm text-neutral-500 leading-normal">
          {product.category} . {product.subCategory}
        </p>
        {colors.length > 0 && (
          <div className="flex gap-1.5 pt-1.5 pb-1">
            {colors.map((color) => (
              <span
                key={color}
                title={color}
                style={{ backgroundColor: color }}
                className="size-3.5 rounded-full border border-neutral-300 shadow-inner inline-block"
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 pt-1.5">
        <p className="font-semibold text-neutral-900 text-[16px]">
          {new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(currentPrice)}
        </p>
        {hasDiscount && (
          <p className="text-[15px] text-neutral-600 line-through">
            {new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(product.basePrice)}
          </p>
        )}
      </div>
      {wishlistError && (
        <p className="mt-2 text-xs text-red-600">{wishlistError}</p>
      )}
    </article>
  );
}
