import { type Product } from "@/types/products";

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const currentPrice = product.salePrice ?? product.basePrice;
  const hasDiscount =
    product.salePrice !== undefined &&
    product.salePrice < product.basePrice;

  const hasStock =
    product.globalStock > 0 ||
    product.variants.some((variant) => variant.stock > 0);

  const colors = [
    ...new Set(
      product.variants
        .map((variant) => variant.color)
        .filter((color): color is string => Boolean(color)),
    ),
  ];

  return (
    <article className="group">
      <div className="relative aspect-square overflow-hidden bg-neutral-100">
        <img
          src={product.images[0]}
          alt={product.name}
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
        />

        <button
          type="button"
          aria-label={`Add ${product.name} to wishlist`}
          className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-white text-xl shadow-sm"
        >
          ♡
        </button>
      </div>

      <div className="space-y-1 pt-4">
        <p className="text-sm font-medium text-red-600">Just In</p>

        <h2 className="font-medium text-neutral-900">
          {product.name}
        </h2>

        <p className="text-sm text-neutral-500">
          {product.brand} · {product.category}
        </p>

        {colors.length > 0 && (
          <div className="flex gap-1 pt-1">
            {colors.map((color) => (
              <span
                key={color}
                title={color}
                className="size-3 rounded-full border border-neutral-300"
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <p className="font-medium text-neutral-900">
            ₹{currentPrice.toLocaleString("en-IN")}
          </p>

          {hasDiscount && (
            <p className="text-sm text-neutral-400 line-through">
              ₹{product.basePrice.toLocaleString("en-IN")}
            </p>
          )}
        </div>

        {!hasStock && (
          <p className="text-sm text-red-600">Out of stock</p>
        )}

        <button
          type="button"
          disabled={!hasStock}
          className="mt-3 w-full bg-black px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {hasStock ? "View product" : "Unavailable"}
        </button>
      </div>
    </article>
  );
}