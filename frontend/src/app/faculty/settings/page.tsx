"use client";

import React, { useState } from "react";
import { ApplicationShell } from "@/components/ApplicationShell";
import { useAuth } from "@/lib/auth";

export default function FacultySettingsPage() {
  const { user, activeRole, setActiveRole } = useAuth();
  const [phone, setPhone] = useState(user?.phone || "");
  const [saved, setSaved] = useState(false);

  return (
    <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / Account Settings">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-[26px] font-bold text-[#171717]">Account Settings</h1>
          <p className="text-[14px] text-[#666]">
            Manage active authority context, contact preferences, and institutional profile settings.
          </p>
        </div>

        {saved && (
          <div className="p-3 bg-[#edf8ef] border border-[#16a34a] text-[#166534] text-[13px] rounded-[6px] font-bold">
            Preferences saved successfully.
          </div>
        )}

        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-6">
          <div className="border-b border-[#f2f2f0] pb-3">
            <h2 className="text-[16px] font-bold text-[#171717]">Institutional Identity</h2>
            <p className="text-[12.5px] text-[#666]">Account details verified against institute registry.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            <div>
              <span className="text-[#666] block text-[11.5px]">Faculty Name</span>
              <p className="font-bold text-[#171717]">{user?.fullName}</p>
            </div>
            <div>
              <span className="text-[#666] block text-[11.5px]">Institutional Email</span>
              <p className="font-bold text-[#171717]">{user?.collegeEmail}</p>
            </div>
            <div>
              <span className="text-[#666] block text-[11.5px]">Department</span>
              <p className="font-bold text-[#171717]">
                {user?.facultyProfile?.department?.name || "Computer Science and Engineering"}
              </p>
            </div>
            <div>
              <span className="text-[#666] block text-[11.5px]">Designation</span>
              <p className="font-bold text-[#171717]">
                {user?.facultyProfile?.designation || "Faculty Member"}
              </p>
            </div>
          </div>
        </div>

        {/* Assigned Roles & Authority Switcher */}
        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-4">
          <div className="border-b border-[#f2f2f0] pb-2">
            <h2 className="text-[16px] font-bold text-[#171717]">Assigned Roles & Context Switcher</h2>
            <p className="text-[12.5px] text-[#666]">
              A single faculty account can hold multiple institutional roles. Switch your active authority context here.
            </p>
          </div>

          <div className="space-y-2">
            {user?.roles?.map((r) => {
              const isActive = activeRole === r.code;
              return (
                <div
                  key={r.id}
                  onClick={() => setActiveRole(r.code)}
                  className={`p-3.5 rounded-[6px] border flex items-center justify-between cursor-pointer transition ${
                    isActive
                      ? "border-[#16a34a] bg-[#edf8ef] text-[#166534]"
                      : "border-[#e2e2df] bg-[#fafaf9] hover:bg-[#f2f2f0] text-[#303030]"
                  }`}
                >
                  <div>
                    <span className="font-bold text-[13.5px] block">{r.name}</span>
                    <span className="text-[11px] text-[#666]">
                      Code: {r.code} · Scope: {r.scopeType}
                    </span>
                  </div>
                  {isActive ? (
                    <span className="text-[12px] font-bold bg-[#16a34a] text-white px-2.5 py-1 rounded">
                      Active Context ✓
                    </span>
                  ) : (
                    <span className="text-[12px] font-semibold text-[#666]">
                      Switch to this role
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ApplicationShell>
  );
}
