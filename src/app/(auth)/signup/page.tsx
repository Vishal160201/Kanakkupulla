"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

export default function SignupPage() {
  const router = useRouter();
  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const registerUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const signInData = await signIn("credentials", {
          email: data.email,
          password: data.password,
          redirect: false,
        });

        if (signInData?.error) {
          setError("Failed to login after registration.");
          setLoading(false);
        } else {
          router.push("/dashboard/overview");
          router.refresh();
        }
      } else {
        const message = await response.text();
        setError(message || "Registration failed.");
        setLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-white w-full rounded-[2rem] shadow-2xl border border-slate-100 p-8 pt-6 pb-10 relative">
      {/* Logo inside card */}
      <div className="flex justify-center mb-4">
        <img src="/assets/logo.png" alt="Kanakkupulla Logo" className="w-[360px] object-contain drop-shadow-sm" />
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-slate-100 p-1 rounded-full inline-flex w-[200px]">
          <Link href="/login" className="flex-1 text-center py-2 text-[0.85rem] font-bold text-slate-500 hover:text-slate-800 rounded-full transition-colors">
            SIGN IN
          </Link>
          <Link href="/signup" className="flex-1 text-center py-2 text-[0.85rem] font-bold text-slate-800 bg-white rounded-full shadow-sm">
            SIGN UP
          </Link>
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-[1.3rem] font-extrabold text-slate-900 tracking-tight">Create Your Account</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl mb-6 text-center border border-red-100 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={registerUser} className="flex flex-col gap-4">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <i className="ph-regular ph-user text-[1.1rem]"></i>
          </div>
          <input 
            type="text" 
            placeholder="Full Name"
            className="w-full h-[50px] pl-11 pr-4 bg-white border border-slate-200 rounded-full text-[0.95rem] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-slate-400"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            required
          />
        </div>

        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <i className="ph-regular ph-envelope text-[1.1rem]"></i>
          </div>
          <input 
            type="email" 
            placeholder="Email/username"
            className="w-full h-[50px] pl-11 pr-4 bg-white border border-slate-200 rounded-full text-[0.95rem] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-slate-400"
            value={data.email}
            onChange={(e) => setData({ ...data, email: e.target.value })}
            required
          />
        </div>

        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <i className="ph-regular ph-lock-key text-[1.1rem]"></i>
          </div>
          <input 
            type="password" 
            placeholder="Password"
            className="w-full h-[50px] pl-11 pr-11 bg-white border border-slate-200 rounded-full text-[0.95rem] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-slate-400"
            value={data.password}
            onChange={(e) => setData({ ...data, password: e.target.value })}
            required
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600">
            <i className="ph-regular ph-eye-slash text-[1.1rem]"></i>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full h-[50px] bg-[#f89d2a] hover:bg-[#e0891d] text-white font-bold rounded-full text-[1rem] shadow-md transition-all flex justify-center items-center gap-2 mt-2 disabled:opacity-70"
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>

      <div className="mt-8 relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-white text-slate-400 text-[0.75rem] font-bold">or</span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button 
          onClick={() => signIn("google", { callbackUrl: "/dashboard/overview" })}
          className="w-full h-[50px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-full text-[0.95rem] shadow-sm transition-all flex justify-center items-center gap-3"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
          Sign up with Google
        </button>
        <button 
          onClick={() => signIn("apple", { callbackUrl: "/dashboard/overview" })}
          className="w-full h-[50px] bg-white border border-slate-900 hover:bg-slate-50 text-slate-900 font-bold rounded-full text-[0.95rem] shadow-sm transition-all flex justify-center items-center gap-3"
        >
          <i className="ph-fill ph-apple-logo text-[1.3rem]"></i>
          Sign up with Apple
        </button>
      </div>

      <div className="mt-8 text-center">
        <span className="text-[0.85rem] text-slate-500">Already have an account? </span>
        <Link href="/login" className="text-[0.85rem] text-[#f89d2a] font-bold hover:underline">Sign In now</Link>
      </div>
    </div>
  );
}
