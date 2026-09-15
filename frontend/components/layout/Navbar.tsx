import Link from "next/link";

export default function Navbar() {
  return (
    <>
      <div className="mb-6 self-start">
        <Link href="/" aria-label="Home">
         
        </Link>
      </div>
      <Link href="/">Home</Link>
      <Link href="/products">Products</Link>
      <Link href="/login">Login</Link>
    </>
  );
}
