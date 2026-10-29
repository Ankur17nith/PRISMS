"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function AboutPage() {
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
        <h1 className="text-[28px] font-bold text-[#171717]">About PRISMS</h1>
        <p className="text-[14px] text-[#666] leading-relaxed">
          The <strong>PhD Research & Institutional Scholars Management System (PRISMS)</strong> is NIT Hamirpur&apos;s
          academic portal dedicated to managing the complete doctoral thesis lifecycle, supervisor assignments, departmental
          reviews, and statutory approvals.
        </p>

        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-4 text-[13px]">
          <h2 className="text-[17px] font-bold text-[#171717]">Key Institutional Objectives</h2>
          <ul className="list-disc pl-5 space-y-2 text-[#525252]">
            <li><strong>Single Source of Truth:</strong> Centralizes all scholar milestones, coursework, pre-PhD seminars, and thesis submissions.</li>
            <li><strong>Strict Role-Based Authority:</strong> Implements statutory separation of roles between Thesis Supervisor, Head of Department (HOD), DDPC Convenor, Chairperson SDPC, Dean of Academic Affairs, and Chairperson Senate.</li>
            <li><strong>Document Security:</strong> Enforces private server-side storage, SHA-256 integrity verification, and browser-only viewing for departmental oversight without unauthorized file dissemination.</li>
            <li><strong>Permanent Version Retention:</strong> Every draft, submission, and revised version is permanently retained in the institutional archive.</li>
          </ul>
        </div>
      </main>

      <footer className="text-center text-[11px] text-[#737373] py-4 border-t border-[#e2e2df]">
        National Institute of Technology Hamirpur · PRISMS Portal
      </footer>
    </div>
  );
}
