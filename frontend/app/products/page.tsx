
import ProductGrid from "@/components/product/ProductGrid";
import { getProducts } from "@/services/product";
export default async function Products() {
  const data = await getProducts();
  return (
    <>
      <main>
        <h1>All Products</h1>
        <ProductGrid products={data.products} />
      </main>
    </>
  );
}
