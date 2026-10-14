import "dotenv/config";
import connectDB from "../config/db.js";
import Product from "../models/productModel.js";
import { products } from "../data/products.js";

await connectDB();

await Product.deleteMany({});
const productsToSeed = products.map(({ _id, ...product }) => ({
  ...product,
  variants: product.variants.map(({ _id: variantId, ...variant }) => variant),
}));

const createdProducts = await Product.insertMany(productsToSeed);

console.log(
  createdProducts.map((product) => ({
    id: product._id.toString(),
    name: product.name,
    variants: product.variants.map((variant) =>
      variant._id.toString(),
    ),
  })),
);

process.exit(0);