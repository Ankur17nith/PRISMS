"use client";

import React from "react";
import { ApplicationShell } from "@/components/ApplicationShell";
import { useAuth } from "@/lib/auth";

export default function StudentProfilePage() {
  const { user } = useAuth();

  return (
    <ApplicationShell portalType="student" breadcrumb="Student portal / My Profile">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-[26px] font-bold text-[#171717]">My Profile</h1>
          <p className="text-[14px] text-[#666]">
            Official institutional scholar record maintained by Academic Affairs.
          </p>
        </div>

        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-4 border-b border-[#f2f2f0] pb-4">
            <div className="w-16 h-16 rounded-full bg-[#f2f2f0] border border-[#e2e2df] flex items-center justify-center font-bold text-xl text-[#303030]">
              {user?.fullName?.slice(0, 2).toUpperCase() || "RS"}
            </div>
            <div>
              <h2 className="text-[19px] font-bold text-[#171717]">{user?.fullName}</h2>
              <p className="text-[12.5px] text-[#666]">
                Roll No: {user?.studentProfile?.rollNumber || "25PHD001"} · Status: {user?.studentProfile?.admissionStatus || "ACTIVE"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            <div className="p-3 bg-[#f7f7f6] rounded border border-[#e2e2df]">
              <span className="text-[#666] block text-[11.5px]">Institutional Email</span>
              <span className="font-bold text-[#171717]">{user?.collegeEmail}</span>
            </div>
            <div className="p-3 bg-[#f7f7f6] rounded border border-[#e2e2df]">
              <span className="text-[#666] block text-[11.5px]">Contact Phone</span>
              <span className="font-bold text-[#171717]">{user?.phone || "+91 (Institutional Record)"}</span>
            </div>
            <div className="p-3 bg-[#f7f7f6] rounded border border-[#e2e2df]">
              <span className="text-[#666] block text-[11.5px]">Programme</span>
              <span className="font-bold text-[#171717]">{user?.studentProfile?.program || "Doctor of Philosophy (PhD)"}</span>
            </div>
            <div className="p-3 bg-[#f7f7f6] rounded border border-[#e2e2df]">
              <span className="text-[#666] block text-[11.5px]">Academic Department</span>
              <span className="font-bold text-[#171717]">
                {user?.studentProfile?.department?.name || "Computer Science and Engineering"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </ApplicationShell>
  );
}
