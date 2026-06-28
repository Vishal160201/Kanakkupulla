"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [data, setData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPendingPopup, setShowPendingPopup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const loginUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const signInData = await signIn("credentials", {
      ...data,
      redirect: false,
    });

    if (signInData?.error) {
      if (signInData.error.startsWith("TEMPORARY_PASSWORD:")) {
        const token = signInData.error.split(":")[1];
        router.push(`/reset-password?token=${token}`);
        return; // Don't stop loading state while redirecting
      }
      
      if (signInData.error === "Approval pending") {
        setShowPendingPopup(true);
      } else if (signInData.error === "Account deactivated") {
        setError("Your account has been deactivated. Please contact support.");
      } else {
        setError("Invalid credentials. Please try again.");
      }
      setLoading(false);
    } else {
      router.push("/dashboard/overview");
      router.refresh();
    }
  };

  return (
    <div className="bg-white w-full rounded-[2rem] shadow-2xl border border-slate-100 p-8 pt-6 pb-10 relative">
      {/* Logo inside card */}
      <div className="flex justify-center mb-4">
        <Image src="/assets/logo.png" alt="Kanakkupulla Logo" width={360} height={100} className="w-[360px] object-contain drop-shadow-sm" />
      </div>



      <div className="text-center mb-8">
        <h1 className="text-[1.3rem] font-extrabold text-slate-900 tracking-tight">Vanakkam da maplei</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl mb-6 text-center border border-red-100 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={loginUser} className="flex flex-col gap-5">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <i className="ph ph-user text-[1.1rem]"></i>
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
            <i className="ph ph-lock-key text-[1.1rem]"></i>
          </div>
          <input 
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="w-full h-[50px] pl-11 pr-11 bg-white border border-slate-200 rounded-full text-[0.95rem] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-slate-400"
            value={data.password}
            onChange={(e) => setData({ ...data, password: e.target.value })}
            required
          />
          <div 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600"
            onClick={() => setShowPassword(!showPassword)}
          >
            <i className={`ph ${showPassword ? 'ph-eye' : 'ph-eye-slash'} text-[1.1rem]`}></i>
          </div>
        </div>

        <div className="flex justify-between items-center px-1 mt-1 mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-orange-500 rounded border-slate-300" />
            <span className="text-[0.8rem] text-slate-600 font-medium">Remember Me</span>
          </label>
          <a href="#" onClick={async (e) => {
            e.preventDefault();
            if (!data.email) {
              setError("Please enter your email address to reset your password.");
            } else {
              try {
                const res = await fetch('/api/auth/forgot-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: data.email })
                });
                const resData = await res.json();
                if (res.ok) {
                  toast.success(resData.message || "Password reset instructions sent.");
                  setError(null);
                } else {
                  setError(resData.error || "Failed to send reset instructions.");
                }
              } catch (err) {
                setError("An error occurred. Please try again.");
              }
            }
          }} className="text-[0.8rem] text-orange-500 font-bold hover:underline">Forgot Password?</a>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full h-[50px] bg-[#f89d2a] hover:bg-[#e0891d] text-white font-bold rounded-full text-[1rem] shadow-md transition-all flex justify-center items-center gap-2 disabled:opacity-70"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>


      {showPendingPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPendingPopup(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-[400px] mx-4 overflow-hidden animate-fade-in p-8 text-center">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mx-auto mb-5 border border-orange-100">
              <i className="ph-fill ph-hourglass-high text-3xl"></i>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-2">Approval Pending</h3>
            <p className="text-[0.95rem] text-slate-500 mb-8 leading-relaxed">
              Your account has been successfully created, but it is currently waiting for an Administrator to approve it. 
              <br/><br/>
              Please check back later or contact the Studio Owner.
            </p>
            <button 
              onClick={() => setShowPendingPopup(false)}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
            >
              Okay, I understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
