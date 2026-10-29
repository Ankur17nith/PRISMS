"use client";

import React from "react";
import { ApplicationShell } from "@/components/ApplicationShell";

export default function FacultyDocumentsPage() {
  const documents = [
    {
      title: "NIT Hamirpur PhD Regulations & Ordinances Manual (2025 Revised)",
      desc: "Complete statutory rules for doctoral supervision, evaluation committees, and thesis requirements.",
      type: "PDF",
      size: "2.8 MB",
    },
    {
      title: "Examiner Panel Recommendation Form (Annexure IX)",
      desc: "Confidential panel form for recommending Indian and International external thesis examiners.",
      type: "DOCX",
      size: "180 KB",
    },
    {
      title: "SDPC Guidelines for Pre-PhD Seminar & Defense Conduct",
      desc: "Procedure for scheduling doctoral defense and oral presentation.",
      type: "PDF",
      size: "420 KB",
    },
  ];

  return (
    <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / Documents & Guidelines">
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-[26px] font-bold text-[#171717]">Documents & Guidelines</h1>
          <p className="text-[14px] text-[#666]">
            Statutory regulations, evaluation forms, and doctoral ordinances for faculty members and committees.
          </p>
        </div>

        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-4">
          <div className="divide-y divide-[#f2f2f0]">
            {documents.map((d, i) => (
              <div key={i} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-[14.5px] text-[#171717]">{d.title}</h3>
                  <p className="text-[12.5px] text-[#666] mt-0.5">{d.desc}</p>
                  <span className="inline-block mt-2 text-[11px] font-semibold text-[#166534] bg-[#edf8ef] px-2 py-0.5 rounded">
                    {d.type} · {d.size}
                  </span>
                </div>
                <button
                  onClick={() => alert(`Downloading ${d.title}`)}
                  className="bg-[#f2f2f0] hover:bg-[#e2e2df] text-[#171717] font-bold text-[12px] px-3.5 py-1.5 rounded transition"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ApplicationShell>
  );
}
