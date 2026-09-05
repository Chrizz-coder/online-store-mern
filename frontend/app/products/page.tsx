import { products } from "@/data/products";
import ProductGrid from "@/components/product/ProductGrid";

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
