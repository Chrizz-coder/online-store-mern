import ProductGrid from "../product/ProductGrid";
import { getProducts } from "@/services/product";
export default async function Hero() {
  const data = await getProducts();
  return (
    <main>
      <h1>Featured Products</h1>
      <ProductGrid products={data.products} />
    </main>
  );
}
