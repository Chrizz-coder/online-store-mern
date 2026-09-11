
import ProductGrid from "@/components/product/ProductGrid";
import { products } from "@/data/products";
export default function Products() {
  return (
    <>
      <main>
        <h1>All Products</h1>
        <ProductGrid products={products} />
      </main>
    </>
  );
}
