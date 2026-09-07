export type ProductVariant ={
    _id:string;
    color?:string;
    size?:string;
    price:number;
    stock:number;
}

export type Product = {
  _id:string;
  name:string;
  slug?:string;
  description:string;
  basePrice:number;
  salePrice?:number;
  brand:string;
  tags: string[];
  images:string[];
  variants: ProductVariant[];
  globalStock:number;
  isActive:boolean;
  averageRating:number;
  createdAt:string;
  updatedAt:string;
}
type ProductsResponse = {
  count:number;
  total:number;
  page:number;
  totalPages:number;
  products:Product[];
}