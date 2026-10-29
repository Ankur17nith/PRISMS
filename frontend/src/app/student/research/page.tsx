"use client";

import React, { useEffect, useState } from "react";
import { ApplicationShell } from "@/components/ApplicationShell";
import { api } from "@/lib/api";

export default function StudentResearchPage() {
  const [draftData, setDraftData] = useState<{
    supervisor: { fullName: string; designation: string } | null;
    draft: { title: string; abstract?: string; keywords: string[] } | null;
  } | null>(null);

  useEffect(() => {
    api.getDraft().then(setDraftData).catch(() => null);
  }, []);

  return (
    <ApplicationShell portalType="student" breadcrumb="Student portal / Research Details">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-[26px] font-bold text-[#171717]">Research Details</h1>
          <p className="text-[14px] text-[#666]">
            Doctoral supervision, research proposal area, and approved milestones.
          </p>
        </div>

        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-[16px] text-[#171717] border-b border-[#f2f2f0] pb-2">
            Supervisory Committee
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            <div className="p-3 bg-[#f7f7f6] rounded border border-[#e2e2df]">
              <span className="text-[#666] block text-[11px] font-bold uppercase">Thesis Supervisor</span>
              <p className="font-bold text-[#171717] text-[14px] mt-0.5">
                {draftData?.supervisor?.fullName || "Dr. Alok Verma"}
              </p>
              <p className="text-[#666] text-[12px]">{draftData?.supervisor?.designation || "Associate Professor"}</p>
            </div>
            <div className="p-3 bg-[#f7f7f6] rounded border border-[#e2e2df]">
              <span className="text-[#666] block text-[11px] font-bold uppercase">Committee Head</span>
              <p className="font-bold text-[#171717] text-[14px] mt-0.5">Head of Department (HOD)</p>
              <p className="text-[#666] text-[12px]">Dept. of Computer Science and Engineering</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-[16px] text-[#171717] border-b border-[#f2f2f0] pb-2">
            Doctoral Dissertation Topic
          </h3>
          <p className="text-[15px] font-bold text-[#171717]">
            {draftData?.draft?.title || "Scalable Consensus Protocols for Heterogeneous Edge Networks"}
          </p>
          <p className="text-[13px] text-[#666] leading-relaxed">
            {draftData?.draft?.abstract ||
              "Investigation into distributed consensus and asynchronous fault tolerance algorithms for edge computing clusters."}
          </p>
          {draftData?.draft?.keywords && (
            <div className="flex flex-wrap gap-2 pt-2">
              {draftData.draft.keywords.map((k) => (
                <span key={k} className="bg-[#f2f2f0] text-[#303030] text-[11px] font-bold px-2.5 py-1 rounded">
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </ApplicationShell>
  );
}
