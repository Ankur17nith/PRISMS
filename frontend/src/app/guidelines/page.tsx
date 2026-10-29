"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function GuidelinesPage() {
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
        <h1 className="text-[28px] font-bold text-[#171717]">Academic Guidelines & Ordinances</h1>
        <p className="text-[14px] text-[#666] leading-relaxed">
          Statutory standards governing PhD research, thesis formatting, anti-plagiarism checks, and examinations.
        </p>

        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-4 text-[13px]">
          <h2 className="text-[17px] font-bold text-[#171717]">Key Regulations</h2>
          <div className="space-y-3 text-[#525252]">
            <p><strong>1. Maximum File Limit:</strong> The dissertation PDF must not exceed 20 MiB and must be a valid, unencrypted PDF.</p>
            <p><strong>2. Plagiarism Verification:</strong> The similarity index must remain strictly below 10%, certified by the supervisor prior to final forwarding.</p>
            <p><strong>3. Publication Requirement:</strong> At least two papers in SCI/SCIE indexed journals and two conference presentations prior to synopsis submission.</p>
            <p><strong>4. Confidentiality of Reviewers:</strong> External Indian and International examiners remain strictly confidential throughout the evaluation process.</p>
          </div>
        </div>
      </main>

      <footer className="text-center text-[11px] text-[#737373] py-4 border-t border-[#e2e2df]">
        National Institute of Technology Hamirpur · PRISMS Portal
      </footer>
    </div>
  );
}
