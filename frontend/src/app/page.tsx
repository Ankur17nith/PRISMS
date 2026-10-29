"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/Icon";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f7f7f6] text-[#303030] flex flex-col justify-between font-sans">
      {/* 1. Institutional Header (Figma 23:1350) */}
      <header className="bg-white border-b border-[#e2e2df]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Institute Identity */}
          <div className="flex items-center gap-4">
            <div className="relative size-[56px] shrink-0">
              <Image
                src="/assets/nith-emblem.png"
                alt="NIT Hamirpur Emblem"
                width={56}
                height={56}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <div className="text-[12px] text-[#737373] font-devanagari">
                राष्ट्रीय प्रौद्योगिकी संस्थान हमीरपुर
              </div>
              <div className="font-bold text-[18px] text-[#171717] tracking-tight">
                National Institute of Technology Hamirpur
              </div>
              <div className="text-[11px] text-[#666]">
                An Institute of National Importance · Ministry of Education, Govt. of India
              </div>
            </div>
          </div>

          {/* PRISMS Identity */}
          <div className="md:text-right border-t md:border-t-0 md:border-l border-[#e2e2df] pt-2 md:pt-0 md:pl-6">
            <div className="font-bold text-[22px] text-[#daa32f] tracking-wide">
              PRISMS
            </div>
            <div className="text-[11.5px] text-[#666]">
              PhD Research Information & Student Management System
            </div>
          </div>
        </div>

        {/* 2. Gold Institutional Navigation Bar (Figma 23:1360) */}
        <div className="bg-[#daa32f] text-[#171717]">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-[13px] font-medium min-h-[40px]">
            <nav className="flex items-center gap-6 overflow-x-auto py-2">
              <Link
                href="/"
                className="font-bold border-b-2 border-[#171717] pb-0.5 whitespace-nowrap"
              >
                Home
              </Link>
              <Link
                href="/about"
                className="hover:text-black transition whitespace-nowrap"
              >
                About PRISMS
              </Link>
              <Link
                href="/workflow"
                className="hover:text-black transition whitespace-nowrap"
              >
                Research Workflow
              </Link>
              <Link
                href="/guidelines"
                className="hover:text-black transition whitespace-nowrap"
              >
                Guidelines
              </Link>
              <Link
                href="/contact"
                className="hover:text-black transition whitespace-nowrap"
              >
                Contact Us
              </Link>
            </nav>

            <Link
              href="/login"
              className="bg-[#171717] hover:bg-[#262626] text-white text-[12.5px] font-bold px-4 py-1.5 rounded-[5px] transition shadow-sm whitespace-nowrap shrink-0"
            >
              Sign In / Login →
            </Link>
          </div>
        </div>
      </header>

      {/* 3. Research Portal Hero (Figma 23:1376) */}
      <section
        className="relative border-b border-[#e2e2df] py-16 md:py-24 px-6 overflow-hidden"
        style={{
          backgroundColor: "#f7f7f6",
          backgroundImage:
            "linear-gradient(to right, #ecece9 1px, transparent 1px), linear-gradient(to bottom, #ecece9 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 bg-[#fbf3de] border border-[#daa32f]/40 px-3.5 py-1 rounded-full text-[12px] font-semibold text-[#8a6515]">
            <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
            Official Doctoral Thesis Portal · NIT Hamirpur
          </div>

          <h1 className="text-[32px] md:text-[44px] font-bold text-[#171717] leading-tight tracking-tight">
            PhD Research & Institutional Scholars Management System
          </h1>

          <p className="text-[15px] md:text-[17px] text-[#525252] max-w-2xl mx-auto leading-relaxed">
            A secure, auditable, and statutory platform orchestrating doctoral thesis submissions,
            supervisor evaluations, departmental reviews, and Senate approvals at NIT Hamirpur.
          </p>

          {/* Action Buttons (Figma 23:1453) */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="bg-[#16a34a] hover:bg-[#15803d] text-white font-bold px-6 py-3 rounded-[6px] text-[14px] transition shadow flex items-center gap-2"
            >
              <span>Sign In to Portal</span>
              <Icon name="arrow-right" size={16} />
            </Link>

            <Link
              href="/workflow"
              className="bg-white hover:bg-[#f2f2f0] border border-[#e2e2df] text-[#171717] font-semibold px-6 py-3 rounded-[6px] text-[14px] transition shadow-sm"
            >
              Explore Workflow
            </Link>

            <Link
              href="/guidelines"
              className="bg-transparent hover:bg-black/5 text-[#525252] font-semibold px-5 py-3 rounded-[6px] text-[14px] transition flex items-center gap-1.5"
            >
              <span>Submission Guidelines</span>
              <span className="text-[12px]">↓</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Core Workflow Pillars (Reference Theme Specifications) */}
      <section className="max-w-7xl mx-auto px-6 py-16 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-[26px] font-bold text-[#171717] mb-2">
            Structured 5-Stage Academic Review Lifecycle
          </h2>
          <p className="text-[14px] text-[#666]">
            Strict separation of statutory roles preserving confidentiality, document security, and immutable audit trails.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1 */}
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-3 hover:border-[#daa32f] transition">
            <div className="w-10 h-10 rounded-lg bg-[#fbf3de] flex items-center justify-center text-[#daa32f]">
              <Icon name="file-up" size={20} />
            </div>
            <h3 className="font-bold text-[17px] text-[#171717]">
              Doctoral Scholar Submission
            </h3>
            <p className="text-[13px] text-[#666] leading-relaxed">
              Authenticated scholars manage drafts, upload thesis PDFs with SHA-256 cryptographic verification,
              and receive real-time review updates across multiple revision loops.
            </p>
            <div className="pt-2">
              <Link href="/login" className="text-[12.5px] font-bold text-[#16a34a] hover:underline">
                Scholar Login →
              </Link>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-3 hover:border-[#daa32f] transition">
            <div className="w-10 h-10 rounded-lg bg-[#eff6ff] flex items-center justify-center text-[#2563eb]">
              <Icon name="dashboard" size={20} />
            </div>
            <h3 className="font-bold text-[17px] text-[#171717]">
              Supervisor & HOD Oversight
            </h3>
            <p className="text-[13px] text-[#666] leading-relaxed">
              Assigned supervisors track scholars and forward submissions. Departmental HODs inspect dossiers
              in browser-only mode with <strong>strict download prohibitions</strong>.
            </p>
            <div className="pt-2">
              <Link href="/login" className="text-[12.5px] font-bold text-[#16a34a] hover:underline">
                Faculty Workspace →
              </Link>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-3 hover:border-[#daa32f] transition">
            <div className="w-10 h-10 rounded-lg bg-[#ecfdf5] flex items-center justify-center text-[#16a34a]">
              <Icon name="book" size={20} />
            </div>
            <h3 className="font-bold text-[17px] text-[#171717]">
              SDPC, Dean & Senate Approvals
            </h3>
            <p className="text-[13px] text-[#666] leading-relaxed">
              Supports parallel institutional dispatch to Chairperson SDPC and Dean Academics, concluding with final
              statutory approval and degree notification by Chairperson Senate.
            </p>
            <div className="pt-2">
              <Link href="/workflow" className="text-[12.5px] font-bold text-[#16a34a] hover:underline">
                View Authority Matrix →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Institutional Footer (Figma 23:1462) */}
      <footer className="bg-white border-t border-[#e2e2df]">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 text-[13px]">
            {/* Column 1: About PRISMS */}
            <div className="space-y-3">
              <h4 className="font-bold text-[15px] text-[#171717]">About PRISMS</h4>
              <p className="text-[#666] leading-relaxed text-[12.5px]">
                PRISMS coordinates doctoral admissions, coursework verification, supervision milestones, and
                multi-tier thesis approvals across all academic departments at NIT Hamirpur.
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div className="space-y-3">
              <h4 className="font-bold text-[15px] text-[#171717]">Quick Links</h4>
              <ul className="space-y-2 text-[#666]">
                <li>
                  <Link href="/" className="hover:text-[#171717] hover:underline">
                    Portal Home
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-[#171717] hover:underline font-semibold text-[#16a34a]">
                    Sign In / Login
                  </Link>
                </li>
                <li>
                  <Link href="/workflow" className="hover:text-[#171717] hover:underline">
                    Research Workflow SOP
                  </Link>
                </li>
                <li>
                  <Link href="/guidelines" className="hover:text-[#171717] hover:underline">
                    Thesis Formatting Guidelines
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-[#171717] hover:underline">
                    About the Institution
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Developers */}
            <div className="space-y-3">
              <h4 className="font-bold text-[15px] text-[#171717]">Developers</h4>
              <p className="text-[#666] text-[12.5px] leading-relaxed">
                Developed for National Institute of Technology Hamirpur, Himachal Pradesh.
              </p>
              <div className="pt-1">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#171717] bg-[#f2f2f0] hover:bg-[#e2e2df] px-3 py-1.5 rounded transition"
                >
                  <span>GitHub</span>
                  <span>↗</span>
                </a>
              </div>
            </div>

            {/* Column 4: Contact Us */}
            <div className="space-y-3">
              <h4 className="font-bold text-[15px] text-[#171717]">Contact Us</h4>
              <div className="space-y-2 text-[#666] text-[12.5px]">
                <p className="leading-snug">
                  📍 National Institute of Technology Hamirpur<br />
                  Himachal Pradesh, India · 177005
                </p>
                <p>
                  ✉️ <a href="mailto:prisms-support@nith.ac.in" className="hover:underline text-[#171717]">prisms-support@nith.ac.in</a>
                </p>
                <p>
                  📞 Office of Dean (Academic): +91-1972-254011
                </p>
              </div>
            </div>
          </div>

          {/* Copyright Strip */}
          <div className="border-t border-[#f2f2f0] pt-6 flex flex-col md:flex-row items-center justify-between text-[12px] text-[#737373] gap-2">
            <div>
              © 2026 National Institute of Technology Hamirpur. All rights reserved.
            </div>
            <div>
              Designed & developed in accordance with NITH Doctoral Regulations.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
