"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function HomePage() {
  const { user, loading, activeRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (activeRole === "STUDENT" || user.roles.some((r) => r.code === "STUDENT")) {
        router.push("/student/dashboard");
      } else {
        router.push("/faculty/dashboard");
      }
    }
  }, [user, loading, activeRole, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f6]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#daa32f] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[14px] text-[#666]">Loading PRISMS Academic Portal...</p>
      </div>
    </div>
  );
}
