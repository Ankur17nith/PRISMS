"use client";

import React from "react";
import { ApplicationShell } from "@/components/ApplicationShell";
import { useAuth } from "@/lib/auth";

export default function FacultyHistoryPage() {
  const { user } = useAuth();

  const activities = [
    {
      action: "Thesis Approved & Forwarded to HOD",
      ref: "TH-2026-001 v2",
      scholar: "Rahul Sharma (25PHD001)",
      timestamp: "Today, 11:20 AM",
      role: "SUPERVISOR",
    },
    {
      action: "Revision Returned with Mandatory Remarks",
      ref: "TH-2026-001 v1",
      scholar: "Rahul Sharma (25PHD001)",
      timestamp: "Yesterday, 4:15 PM",
      role: "SDPC",
    },
    {
      action: "Thesis Evaluated & Forwarded to SDPC / Dean",
      ref: "TH-2026-001 v1",
      scholar: "Rahul Sharma (25PHD001)",
      timestamp: "24 Oct 2026, 2:30 PM",
      role: "HOD",
    },
  ];

  return (
    <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / Activity History">
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-[26px] font-bold text-[#171717]">Activity History</h1>
          <p className="text-[14px] text-[#666]">
            Immutable audit record of review decisions, forwarding actions, and evaluations submitted by {user?.fullName}.
          </p>
        </div>

        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-4">
          <div className="divide-y divide-[#f2f2f0]">
            {activities.map((act, i) => (
              <div key={i} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-[14px] text-[#171717]">{act.action}</h3>
                  <p className="text-[12.5px] text-[#666] mt-0.5">
                    Submission: <span className="font-mono font-semibold">{act.ref}</span> · Scholar: {act.scholar}
                  </p>
                  <span className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded bg-[#f2f2f0] text-[#303030]">
                    Role: {act.role}
                  </span>
                </div>
                <span className="text-[11.5px] text-[#737373] shrink-0">{act.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ApplicationShell>
  );
}
