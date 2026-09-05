import ProductGrid from "../product/ProductGrid";
import { products } from "@/data/products";
export default function Hero() {
  return (
    <main>
      <h1>Featured Products</h1>
      <ProductGrid products={products} />
    </main>
  );
}
