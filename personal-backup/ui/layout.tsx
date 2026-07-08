import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import PersonalNav from "./PersonalNav";

export default async function PersonalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  
  if (session?.user?.email !== "nithyavishalr@gmail.com") {
    redirect("/dashboard/overview");
  }

  const userName = session?.user?.name || "Studio User";
  const userInitials = userName.substring(0, 2).toUpperCase();

  return (
    <div className="w-full flex flex-col h-full font-sans animate-[scaleIn_300ms_ease-out]">
      <style>{`
        @keyframes slideUp { 
          from { transform: translateY(16px); opacity: 0; } 
          to { transform: translateY(0); opacity: 1; } 
        }

        @keyframes fadeIn { 
          from { opacity: 0; } 
          to { opacity: 1; } 
        }

        @keyframes scaleIn { 
          from { transform: scale(0.96); opacity: 0; } 
          to { transform: scale(1); opacity: 1; } 
        }
      `}</style>
      <div className="mb-6">
        <PersonalNav />
      </div>
      <div className="flex-1 w-full relative">
        {children}
      </div>
    </div>
  );
}
