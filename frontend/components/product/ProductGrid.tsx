import ProductCard, { type Product } from "./ProductCard";

type ProductGridProps = {
  products: Product[];
};

export default function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="max-w-7xl mx-auto px-4  sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10">
        {products.map((prod) => (
          <ProductCard key={prod.id} product={prod} />
        ))}
      </div>
      
    </div>
    
  );
}
