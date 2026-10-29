"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function WorkflowPage() {
  const steps = [
    {
      role: "1. Research Scholar",
      title: "Draft Preparation & Submission",
      desc: "Scholar uploads thesis PDF (max 20 MiB, %PDF- validated), abstract, and metadata, verifying assigned supervisor.",
    },
    {
      role: "2. Thesis Supervisor",
      title: "Supervisor Review & Verification",
      desc: "Assigned supervisor evaluates dissertation, downloads PDF for detailed review, and forwards to Head of Department (HOD) or returns for revision.",
    },
    {
      role: "3. Head of Department (HOD)",
      title: "Departmental Review (View-Only)",
      desc: "HOD inspects thesis in secure browser viewer (downloads strictly denied) and forwards in parallel to Chairperson SDPC and/or Dean Academics.",
    },
    {
      role: "4. Chairperson SDPC & Dean Academics",
      title: "Senate Doctoral Programme Committee",
      desc: "SDPC chairperson and Dean Academics verify institutional ordinance compliance and forward to Chairperson Senate.",
    },
    {
      role: "5. Chairperson Senate (Director)",
      title: "Final Statutory Approval",
      desc: "Director / Senate Chairperson grants final approval for degree conferment and public defense.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f6] text-[#303030] flex flex-col justify-between">
      <header className="bg-white border-b border-[#e2e2df] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/assets/nith-emblem.png" alt="" width={48} height={48} className="object-contain" />
          <div>
            <div className="text-[11.5px] text-[#737373] font-devanagari">राष्ट्रीय प्रौद्योगिकी संस्थान हमीरपुर</div>
            <div className="font-bold text-[16px] text-[#171717]">National Institute of Technology Hamirpur</div>
          </div>
        </div>
        <Link href="/" className="text-[13px] font-bold text-[#16a34a] hover:underline">← Back to Portal</Link>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-6 space-y-6">
        <h1 className="text-[28px] font-bold text-[#171717]">Institutional Thesis Workflow</h1>
        <p className="text-[14px] text-[#666] leading-relaxed">
          The official multi-tier statutory approval lifecycle for PhD theses at NIT Hamirpur.
        </p>

        <div className="space-y-4">
          {steps.map((st, i) => (
            <div key={i} className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#16a34a] text-white font-bold flex items-center justify-center shrink-0 text-sm">
                {i + 1}
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#daa32f] block">
                  {st.role}
                </span>
                <h3 className="text-[16px] font-bold text-[#171717] mt-0.5">{st.title}</h3>
                <p className="text-[13px] text-[#666] mt-1 leading-relaxed">{st.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center text-[11px] text-[#737373] py-4 border-t border-[#e2e2df]">
        National Institute of Technology Hamirpur · PRISMS Portal
      </footer>
    </div>
  );
}
