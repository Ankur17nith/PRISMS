"use client";

import React from "react";
import { ApplicationShell } from "@/components/ApplicationShell";

export default function StudentHelpPage() {
  return (
    <ApplicationShell portalType="student" breadcrumb="Student portal / Help & Support">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-[26px] font-bold text-[#171717]">Help & Institutional Support</h1>
          <p className="text-[14px] text-[#666]">
            Guidance for thesis formatting, committee routing, and technical portal support.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-3">
            <h3 className="font-bold text-[16px] text-[#171717] border-b border-[#f2f2f0] pb-2">
              Academic Affairs & SDPC
            </h3>
            <p className="text-[13px] text-[#666]">
              For queries related to doctoral ordinance compliance, thesis submission deadlines, and committee clearances:
            </p>
            <div className="text-[12.5px] space-y-1 text-[#303030]">
              <p><span className="font-bold">Office:</span> Senate Doctoral Programme Committee (SDPC)</p>
              <p><span className="font-bold">Email:</span> sdpc@nith.ac.in</p>
              <p><span className="font-bold">Phone:</span> +91 1972 254011</p>
              <p><span className="font-bold">Location:</span> Administrative Block, NIT Hamirpur</p>
            </div>
          </div>

          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-3">
            <h3 className="font-bold text-[16px] text-[#171717] border-b border-[#f2f2f0] pb-2">
              Departmental Contact
            </h3>
            <p className="text-[13px] text-[#666]">
              For supervisor assignments, progress reviews, and seminar schedules:
            </p>
            <div className="text-[12.5px] space-y-1 text-[#303030]">
              <p><span className="font-bold">Department:</span> Computer Science and Engineering</p>
              <p><span className="font-bold">Head of Dept:</span> hod_cse@nith.ac.in</p>
              <p><span className="font-bold">DDPC Convenor:</span> ddpc_cse@nith.ac.in</p>
              <p><span className="font-bold">Office:</span> CSE Department Building, Ground Floor</p>
            </div>
          </div>
        </div>
      </div>
    </ApplicationShell>
  );
}
