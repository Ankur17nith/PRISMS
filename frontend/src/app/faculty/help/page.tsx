"use client";

import React from "react";
import { ApplicationShell } from "@/components/ApplicationShell";

export default function FacultyHelpPage() {
  return (
    <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / Help & Support">
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-[26px] font-bold text-[#171717]">Faculty Help & Support</h1>
          <p className="text-[14px] text-[#666]">
            Institutional administrative and workflow support for supervising faculty and committee chairs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-3">
            <h3 className="font-bold text-[16px] text-[#171717] border-b border-[#f2f2f0] pb-2">
              Dean (Academic) & SDPC Support
            </h3>
            <p className="text-[13px] text-[#666]">
              For statutory doctoral workflow queries, external examiner appointments, and Senate meeting schedules:
            </p>
            <div className="text-[12.5px] space-y-1.5 text-[#303030]">
              <p><span className="font-bold">Dean of Academic Affairs:</span> dean_academics@nith.ac.in</p>
              <p><span className="font-bold">Chairperson SDPC:</span> sdpc_chair@nith.ac.in</p>
              <p><span className="font-bold">Academic Section PBX:</span> +91 1972 254011 / 254012</p>
            </div>
          </div>

          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-3">
            <h3 className="font-bold text-[16px] text-[#171717] border-b border-[#f2f2f0] pb-2">
              IT & Portal Administration
            </h3>
            <p className="text-[13px] text-[#666]">
              For role permissions, digital certificate signatures, or technical issues in PRISMS:
            </p>
            <div className="text-[12.5px] space-y-1.5 text-[#303030]">
              <p><span className="font-bold">System Administrator:</span> admin@nith.ac.in</p>
              <p><span className="font-bold">Computer Center Helpdesk:</span> cc_help@nith.ac.in</p>
              <p><span className="font-bold">Server Location:</span> NIT Hamirpur Data Center</p>
            </div>
          </div>
        </div>
      </div>
    </ApplicationShell>
  );
}
