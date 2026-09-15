"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";


export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${backendUrl}/api/user/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setSuccess("Login successful");
      setFormData({ email: "", password: "" });

      router.push("/");
      router.refresh();
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }

    console.log("Logging user in via API:", formData);
  };

  return (
    <div className="w-full flex items-center justify-center px-4 py-20 bg-white min-h-[calc(100vh-140px)]">
      <div className="w-full max-w-[360px] text-left flex flex-col bg-white">
        <h1 className="text-[26px] font-bold tracking-tighter uppercase font-sans leading-none text-[#111111]">
          YOUR ACCOUNT FOR EVERYTHING
        </h1>
        <p className="text-sm text-[#707072] mt-3 mb-6 leading-relaxed font-sans">
          Sign in to access your customized dashboard profile, shopping bags,
          and history logs.
        </p>
        {error && (
          <p className="mb-4 text-sm font-medium text-red-600 bg-red-50 p-3 rounded-sm border border-red-100">{error}</p>
        )}
        {success && (
          <p className="mb-4 text-sm font-medium text-green-600 bg-green-50 p-3 rounded-sm border border-green-100">
            {success}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 text-sm border 
              text-black border-[#e5e5e5] rounded-sm bg-white placeholder-neutral-400 focus:outline-none focus:border-black transition-colors"
          />

          <div className="relative w-full">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 text-sm border 
              text-black border-[#e5e5e5] rounded-sm bg-white placeholder-neutral-400 focus:outline-none focus:border-black transition-colors"
            />
          </div>

          <div className="flex justify-end pt-1">
            <a
              href="#"
              className="text-xs text-[#707072] hover:text-black underline font-sans"
            >
              Forgot your password?
            </a>
          </div>

          <button
            type="submit"
            className="w-full mt-4 bg-black text-white rounded-sm text-xs font-bold uppercase tracking-normal py-4 active:scale-[0.99]  focus:outline-none transition-colors
            hover:bg-[#222222]"
          >
            Sign In
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-[#707072] font-sans">
          Not a Member?{" "}
          <Link
            href="/register"
            className="text-black underline font-medium hover:text-neutral-700"
          >
            Join Us.
          </Link>
        </div>
      </div>
    </div>
  );
}
