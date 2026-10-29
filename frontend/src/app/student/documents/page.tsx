"use client";

import React from "react";
import { ApplicationShell } from "@/components/ApplicationShell";

export default function StudentDocumentsPage() {
  const guidelines = [
    {
      title: "NIT Hamirpur PhD Thesis Formatting Guidelines (Ordinance Annexure VII)",
      desc: "Mandatory margins, font sizes (Arimo / Times 12pt), line spacing (1.5), referencing IEEE/ACM style.",
      type: "PDF",
      size: "1.4 MB",
    },
    {
      title: "LaTeX Dissertation Template (Official NITH Format)",
      desc: "Pre-configured .tex template with title page, certificates, copyright and chapter styling.",
      type: "ZIP",
      size: "3.2 MB",
    },
    {
      title: "Plagiarism Verification & Turnitin Policy",
      desc: "Standard institutional threshold (< 10% similarity excluding references and publications).",
      type: "PDF",
      size: "450 KB",
    },
    {
      title: "Checklist for Final Synopsis & Pre-PhD Defense Submission",
      desc: "Required committee sign-offs, fee clearance receipt, and coursework transcripts.",
      type: "PDF",
      size: "620 KB",
    },
  ];

  return (
    <ApplicationShell portalType="student" breadcrumb="Student portal / Documents & Guidelines">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-[26px] font-bold text-[#171717]">Documents & Guidelines</h1>
          <p className="text-[14px] text-[#666]">
            Official templates, formatting standards, and institutional thesis submission guidelines.
          </p>
        </div>

        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-4">
          <div className="divide-y divide-[#f2f2f0]">
            {guidelines.map((g, i) => (
              <div key={i} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-[14.5px] text-[#171717]">{g.title}</h3>
                  <p className="text-[12.5px] text-[#666] mt-0.5">{g.desc}</p>
                  <span className="inline-block mt-2 text-[11px] font-semibold text-[#166534] bg-[#edf8ef] px-2 py-0.5 rounded">
                    {g.type} · {g.size}
                  </span>
                </div>
                <button
                  onClick={() => alert(`Downloading ${g.title}`)}
                  className="shrink-0 bg-[#f2f2f0] hover:bg-[#e2e2df] text-[#171717] font-bold text-[12px] px-3.5 py-1.5 rounded transition"
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
