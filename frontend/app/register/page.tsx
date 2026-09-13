"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    try {
      const response = await fetch(`${backendUrl}/api/user/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Registration Failed");
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setSuccess("Account created successfully.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went Wrong");
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="w-full bg-white flex items-center justify-center px-4 sm:px-6 py-12 min-h-[calc(100vh-140px)]">
      <div className="w-full max-w-90 text-left flex flex-col bg-white">
        <h1 className="text-[26px] text-bold tracking-tighter uppercase font-sans mb-2 leading-none text-[#111111]">
          Become a Member
        </h1>
        {error && (
          <p className="mb-4 text-sm text-red-600 font-medium">{error}</p>
        )}
        {success && (
          <p className="mb-4 text-sm text-green-600 font-medium">{success}</p>
        )}
        <p className="text-sm text-[#707072] leading-normal font-sans mt-3 mb-6">
          Create your account to track your orders, manage your cart, and access
          modern gear.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              name="name"
              required
              placeholder="Username"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 text-sm border 
              text-black border-[#e5e5e5] rounded-sm bg-white placeholder-neutral-400 focus:outline-none focus:border-black transition-colors"
            />
          </div>
          <div>
            <input
              type="email"
              name="email"
              required
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 text-sm border 
              text-black border-[#e5e5e5] rounded-sm bg-white placeholder-neutral-400 focus:outline-none focus:border-black transition-colors"
            />
          </div>
          <div>
            <input
              type="password"
              name="password"
              required
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 text-sm border 
              text-black border-[#e5e5e5] rounded-sm bg-white placeholder-neutral-400 focus:outline-none focus:border-black transition-colors"
            />
          </div>
          <p className="text-[12px] text-[#707072] leading-normal font-sans pt-2">
            By creating an account, you agree to our{" "}
            <a href="#" className="underline hover:text-black">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="#" className="underline hover:text-black">
              Terms of Use
            </a>
            .
          </p>
          <button
            type="submit"
            className="w-full mt-4 bg-black text-white rounded-sm text-xs font-bold uppercase tracking-normal py-4 active:scale-[0.99]  focus:outline-none transition-colors
            hover:bg-[#222222]"
          >
            Join Us
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-[#707072]">
          Already a Member?{" "}
          <Link
            href="/login"
            className="text-black underline font-medium hover:text-neutral-700"
          >
            Sign In.
          </Link>
        </div>
      </div>
    </main>
  );
}
