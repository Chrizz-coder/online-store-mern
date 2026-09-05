export type Product = {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
};

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
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
