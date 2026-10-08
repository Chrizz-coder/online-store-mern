"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  return (
    <nav className="flex items-center gap-4 p-4">
      <Link href="/" aria-label="Home">
        Home
      </Link>
      <Link href="/products">Products</Link>
      {!isLoading && isAuthenticated && user ? (
        <>
          <span>Hi, {user.name}</span>
          <button type="button" onClick={logout}>
            Logout
          </button>
        </>
      ) : (
        <Link href="/login">Login</Link>
      )}
    </nav>
  );
}
