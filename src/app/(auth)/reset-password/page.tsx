"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid or missing token.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Password updated successfully!");
        router.push("/login");
      } else {
        setError(data.error || "Failed to reset password.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="bg-white w-full rounded-[2rem] shadow-2xl border border-slate-100 p-8 text-center">
        <h2 className="text-xl font-bold text-red-500 mb-4">Invalid Link</h2>
        <p className="text-slate-500 mb-6">Your password reset link is invalid or has expired.</p>
        <Link href="/login" className="text-orange-500 font-bold hover:underline">
          Return to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white w-full rounded-[2rem] shadow-2xl border border-slate-100 p-8 pt-6 pb-10 relative">
      <div className="flex justify-center mb-4">
        <Image src="/assets/logo.png" alt="Kanakkupulla Logo" width={360} height={100} className="w-[360px] object-contain drop-shadow-sm" />
      </div>

      <div className="text-center mb-8">
        <h1 className="text-[1.3rem] font-extrabold text-slate-900 tracking-tight">Create New Password</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl mb-6 text-center border border-red-100 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={resetPassword} className="flex flex-col gap-5">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <i className="ph ph-lock-key text-[1.1rem]"></i>
          </div>
          <input 
            type={showPassword ? "text" : "password"}
            placeholder="New Password"
            className="w-full h-[50px] pl-11 pr-11 bg-white border border-slate-200 rounded-full text-[0.95rem] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-slate-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600"
            onClick={() => setShowPassword(!showPassword)}
          >
            <i className={`ph ${showPassword ? 'ph-eye' : 'ph-eye-slash'} text-[1.1rem]`}></i>
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <i className="ph ph-lock-key text-[1.1rem]"></i>
          </div>
          <input 
            type={showPassword ? "text" : "password"}
            placeholder="Confirm New Password"
            className="w-full h-[50px] pl-11 pr-4 bg-white border border-slate-200 rounded-full text-[0.95rem] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-slate-400"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full h-[50px] bg-[#f89d2a] hover:bg-[#e0891d] text-white font-bold rounded-full text-[1rem] shadow-md transition-all flex justify-center items-center gap-2 mt-2 disabled:opacity-70"
        >
          {loading ? "Updating..." : "Reset Password"}
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <Link href="/login" className="text-[0.85rem] text-slate-500 font-medium hover:text-slate-800 transition-colors">
          Back to Login
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-white text-center">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
