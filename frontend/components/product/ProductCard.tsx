import { type Product } from "@/types/products";

type ProductCardProps = {
  product: Product;
};
export default function ProductCard({ product }: ProductCardProps) {
  const currentPrice = product.salePrice ?? product.basePrice;
  const hasDiscount =
    product.salePrice !== undefined && product.salePrice < product.basePrice;
  
  return (
    <article className="">
      <img src={product.image} alt={product.name} />
      <p>{product.name}</p>
      <p>{product.brand}</p>

      <p>${product.price}</p>
      <button>Add to Cart</button>
    </article>
  );
}
