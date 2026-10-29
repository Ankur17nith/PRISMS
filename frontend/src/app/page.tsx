"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/Icon";

type NavTab = "home" | "about" | "workflow" | "guidelines" | "contact";

export default function HomePage() {
  const [activeTab, setActiveTabState] = useState<NavTab>("home");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as NavTab | null;
      if (tabParam && ["home", "about", "workflow", "guidelines", "contact"].includes(tabParam)) {
        setActiveTabState(tabParam);
      }
    }
  }, []);

  const setActiveTab = (tab: NavTab) => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      const url = tab === "home" ? "/" : `/?tab=${tab}`;
      window.history.replaceState(null, "", url);
    }
  };

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
              <button
                type="button"
                onClick={() => setActiveTab("home")}
                className={`cursor-pointer pb-0.5 whitespace-nowrap transition ${
                  activeTab === "home"
                    ? "font-bold border-b-2 border-[#171717] text-black"
                    : "hover:text-black opacity-85 hover:opacity-100"
                }`}
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("about")}
                className={`cursor-pointer pb-0.5 whitespace-nowrap transition ${
                  activeTab === "about"
                    ? "font-bold border-b-2 border-[#171717] text-black"
                    : "hover:text-black opacity-85 hover:opacity-100"
                }`}
              >
                About PRISMS
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("workflow")}
                className={`cursor-pointer pb-0.5 whitespace-nowrap transition ${
                  activeTab === "workflow"
                    ? "font-bold border-b-2 border-[#171717] text-black"
                    : "hover:text-black opacity-85 hover:opacity-100"
                }`}
              >
                Research Workflow
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("guidelines")}
                className={`cursor-pointer pb-0.5 whitespace-nowrap transition ${
                  activeTab === "guidelines"
                    ? "font-bold border-b-2 border-[#171717] text-black"
                    : "hover:text-black opacity-85 hover:opacity-100"
                }`}
              >
                Guidelines
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("contact")}
                className={`cursor-pointer pb-0.5 whitespace-nowrap transition ${
                  activeTab === "contact"
                    ? "font-bold border-b-2 border-[#171717] text-black"
                    : "hover:text-black opacity-85 hover:opacity-100"
                }`}
              >
                Contact Us
              </button>
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

      {/* 3. Research Portal Hero / Dynamic Center Card (Figma 23:1376) */}
      <section
        className="relative flex-1 flex items-center justify-center py-16 px-6 overflow-hidden min-h-[460px]"
        style={{
          backgroundColor: "#f7f7f6",
          backgroundImage:
            "linear-gradient(to right, #ecece9 1px, transparent 1px), linear-gradient(to bottom, #ecece9 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <div className="max-w-4xl w-full mx-auto relative z-10">
          {/* TAB 1: DEFAULT HOME VIEW */}
          {activeTab === "home" && (
            <div className="text-center space-y-6 animate-fadeIn">
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

                <button
                  type="button"
                  onClick={() => setActiveTab("workflow")}
                  className="bg-white hover:bg-[#f2f2f0] border border-[#e2e2df] text-[#171717] font-semibold px-6 py-3 rounded-[6px] text-[14px] transition shadow-sm cursor-pointer"
                >
                  Explore Workflow
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("guidelines")}
                  className="bg-transparent hover:bg-black/5 text-[#525252] font-semibold px-5 py-3 rounded-[6px] text-[14px] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Submission Guidelines</span>
                  <span className="text-[12px]">↓</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ABOUT PRISMS CARD */}
          {activeTab === "about" && (
            <div className="bg-white border border-[#e2e2df] rounded-[10px] p-8 shadow-md space-y-6 animate-fadeIn">
              <div className="flex items-start justify-between border-b border-[#f2f2f0] pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#daa32f]">
                    NIT Hamirpur Institutional Governance
                  </span>
                  <h2 className="text-[24px] font-bold text-[#171717] mt-1">
                    About PRISMS
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("home")}
                  className="text-[12.5px] font-bold text-[#666] hover:text-[#171717] bg-[#f7f7f6] hover:bg-[#e2e2df] px-3 py-1.5 rounded transition cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              <p className="text-[14px] text-[#525252] leading-relaxed">
                The <strong>PhD Research & Institutional Scholars Management System (PRISMS)</strong> is NIT Hamirpur&apos;s
                official academic portal designed to manage the entire doctoral thesis submission lifecycle, supervisor evaluations,
                departmental oversight, and Senate degree notifications.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
                <div className="bg-[#fcfcfb] border border-[#e2e2df] p-4 rounded-[6px] space-y-1">
                  <h4 className="font-bold text-[#171717]">Single Source of Truth</h4>
                  <p className="text-[#666] text-[12px]">
                    Centralizes all research scholar milestones, comprehensive exams, synopsis records, and dissertation versions.
                  </p>
                </div>

                <div className="bg-[#fcfcfb] border border-[#e2e2df] p-4 rounded-[6px] space-y-1">
                  <h4 className="font-bold text-[#171717]">Strict Role-Based Authority</h4>
                  <p className="text-[#666] text-[12px]">
                    Enforces statutory separation between Thesis Supervisor, Head of Department (HOD), DDPC, SDPC, and Senate.
                  </p>
                </div>

                <div className="bg-[#fcfcfb] border border-[#e2e2df] p-4 rounded-[6px] space-y-1">
                  <h4 className="font-bold text-[#171717]">Document Security Boundaries</h4>
                  <p className="text-[#666] text-[12px]">
                    Private server-side storage with SHA-256 integrity verification. HODs are strictly restricted to browser-only viewing with downloads denied.
                  </p>
                </div>

                <div className="bg-[#fcfcfb] border border-[#e2e2df] p-4 rounded-[6px] space-y-1">
                  <h4 className="font-bold text-[#171717]">Permanent Version Retention</h4>
                  <p className="text-[#666] text-[12px]">
                    Every submitted version, return remark, and approval timestamp is permanently retained in an immutable institutional archive.
                  </p>
                </div>

                <div className="bg-[#fcfcfb] border border-[#e2e2df] p-4 rounded-[6px] space-y-2 md:col-span-2">
                  <h4 className="font-bold text-[#171717]">System Engineering & Development</h4>
                  <p className="text-[#666] text-[12px]">
                    PRISMS was designed and developed for the National Institute of Technology Hamirpur by:
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <a
                      href="https://ankur-portfolio-topaz.vercel.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Ankur Gupta portfolio (opens in new tab)"
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#171717] hover:text-[#16a34a] bg-white border border-[#e2e2df] px-3 py-1.5 rounded-[4px] hover:border-[#16a34a] transition focus:outline-none focus:ring-2 focus:ring-[#daa32f]"
                    >
                      <span>Ankur Gupta (Portfolio)</span>
                      <span>↗</span>
                    </a>
                    <a
                      href="https://github.com/itzzadi04"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Aditya Sharma GitHub profile (opens in new tab)"
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#171717] hover:text-[#16a34a] bg-white border border-[#e2e2df] px-3 py-1.5 rounded-[4px] hover:border-[#16a34a] transition focus:outline-none focus:ring-2 focus:ring-[#daa32f]"
                    >
                      <span>Aditya Sharma (GitHub)</span>
                      <span>↗</span>
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab("home")}
                  className="text-[13px] font-bold text-[#666] hover:text-[#171717] cursor-pointer"
                >
                  ← Back to Home
                </button>
                <Link
                  href="/login"
                  className="bg-[#16a34a] hover:bg-[#15803d] text-white font-bold px-5 py-2 rounded text-[13px] transition"
                >
                  Sign In to Portal →
                </Link>
              </div>
            </div>
          )}

          {/* TAB 3: RESEARCH WORKFLOW CARD */}
          {activeTab === "workflow" && (
            <div className="bg-white border border-[#e2e2df] rounded-[10px] p-8 shadow-md space-y-6 animate-fadeIn">
              <div className="flex items-start justify-between border-b border-[#f2f2f0] pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#daa32f]">
                    Statutory Review Lifecycle
                  </span>
                  <h2 className="text-[24px] font-bold text-[#171717] mt-1">
                    Doctoral Thesis Approval Workflow
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("home")}
                  className="text-[12.5px] font-bold text-[#666] hover:text-[#171717] bg-[#f7f7f6] hover:bg-[#e2e2df] px-3 py-1.5 rounded transition cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              <div className="space-y-3.5 text-[13px]">
                <div className="flex items-start gap-3 p-3 bg-[#fafaf9] rounded border border-[#f2f2f0]">
                  <span className="w-6 h-6 rounded-full bg-[#daa32f] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <h4 className="font-bold text-[#171717]">Stage 1: Scholar Submission & Integrity Check</h4>
                    <p className="text-[#666] text-[12px] mt-0.5">
                      Doctoral scholar submits final dissertation PDF. System validates PDF magic bytes (%PDF-), verifies 20 MiB size limit, and generates SHA-256 checksum.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#fafaf9] rounded border border-[#f2f2f0]">
                  <span className="w-6 h-6 rounded-full bg-[#171717] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <h4 className="font-bold text-[#171717]">Stage 2: Supervisor Evaluation & Recipient Selection</h4>
                    <p className="text-[#666] text-[12px] mt-0.5">
                      Assigned thesis supervisor reviews dissertation, downloads copy for annotation, and forwards to eligible Head of Department (HOD) or returns for revision.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#fffbeb] rounded border border-[#daa32f]/40">
                  <span className="w-6 h-6 rounded-full bg-[#d97706] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <h4 className="font-bold text-[#171717]">Stage 3: Head of Department (View-Only · Strict Download Denial)</h4>
                    <p className="text-[#666] text-[12px] mt-0.5">
                      HOD reviews document in browser-only mode without file export/download capability. HOD can dispatch in parallel to both Chairperson SDPC and Dean Academics.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#fafaf9] rounded border border-[#f2f2f0]">
                  <span className="w-6 h-6 rounded-full bg-[#171717] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <h4 className="font-bold text-[#171717]">Stage 4: Institutional SDPC & Dean Academics Review</h4>
                    <p className="text-[#666] text-[12px] mt-0.5">
                      Senate Doctoral Programme Committee Chairperson and Dean (Academic Affairs) conduct statutory institutional review.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#ecfdf5] rounded border border-[#16a34a]/30">
                  <span className="w-6 h-6 rounded-full bg-[#16a34a] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    5
                  </span>
                  <div>
                    <h4 className="font-bold text-[#171717]">Stage 5: Final Senate Approval & Thesis Closure</h4>
                    <p className="text-[#666] text-[12px] mt-0.5">
                      Chairperson Senate (Director NIT Hamirpur) grants statutory final approval, transitioning thesis to CLOSED and awarding PhD degree notification.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab("home")}
                  className="text-[13px] font-bold text-[#666] hover:text-[#171717] cursor-pointer"
                >
                  ← Back to Home
                </button>
                <Link
                  href="/login"
                  className="bg-[#16a34a] hover:bg-[#15803d] text-white font-bold px-5 py-2 rounded text-[13px] transition"
                >
                  Sign In to Portal →
                </Link>
              </div>
            </div>
          )}

          {/* TAB 4: GUIDELINES CARD */}
          {activeTab === "guidelines" && (
            <div className="bg-white border border-[#e2e2df] rounded-[10px] p-8 shadow-md space-y-6 animate-fadeIn">
              <div className="flex items-start justify-between border-b border-[#f2f2f0] pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#daa32f]">
                    Academic Requirements
                  </span>
                  <h2 className="text-[24px] font-bold text-[#171717] mt-1">
                    Thesis Submission Guidelines
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("home")}
                  className="text-[12.5px] font-bold text-[#666] hover:text-[#171717] bg-[#f7f7f6] hover:bg-[#e2e2df] px-3 py-1.5 rounded transition cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              <div className="space-y-4 text-[13px] text-[#525252]">
                <div className="p-4 bg-[#fafaf9] rounded border border-[#e2e2df] space-y-2">
                  <h4 className="font-bold text-[#171717]">1. Document Format & File Constraints</h4>
                  <ul className="list-disc pl-5 space-y-1 text-[12.5px] text-[#666]">
                    <li>Upload must be a single authentic PDF file (PDF/A recommended).</li>
                    <li>Maximum file size allowed is <strong>20 MiB</strong>.</li>
                    <li>Files are verified cryptographically via magic bytes (%PDF-) and SHA-256 checksums.</li>
                  </ul>
                </div>

                <div className="p-4 bg-[#fafaf9] rounded border border-[#e2e2df] space-y-2">
                  <h4 className="font-bold text-[#171717]">2. Plagiarism Policy & Colloquium</h4>
                  <ul className="list-disc pl-5 space-y-1 text-[12.5px] text-[#666]">
                    <li>Similarity index report must be below institutional threshold (10% excluding references).</li>
                    <li>Pre-submission oral colloquium must be successfully defended and certified by DDPC.</li>
                  </ul>
                </div>

                <div className="p-4 bg-[#fafaf9] rounded border border-[#e2e2df] space-y-2">
                  <h4 className="font-bold text-[#171717]">3. Multi-Version Resubmission</h4>
                  <ul className="list-disc pl-5 space-y-1 text-[12.5px] text-[#666]">
                    <li>If a review committee returns a thesis for revision, resubmission creates Version N+1.</li>
                    <li>Prior versions, files, and reviewer remarks remain permanently preserved in the audit log.</li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab("home")}
                  className="text-[13px] font-bold text-[#666] hover:text-[#171717] cursor-pointer"
                >
                  ← Back to Home
                </button>
                <Link
                  href="/login"
                  className="bg-[#16a34a] hover:bg-[#15803d] text-white font-bold px-5 py-2 rounded text-[13px] transition"
                >
                  Sign In to Portal →
                </Link>
              </div>
            </div>
          )}

          {/* TAB 5: CONTACT US CARD */}
          {activeTab === "contact" && (
            <div className="bg-white border border-[#e2e2df] rounded-[10px] p-8 shadow-md space-y-6 animate-fadeIn">
              <div className="flex items-start justify-between border-b border-[#f2f2f0] pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#daa32f]">
                    Directory & Helpdesk
                  </span>
                  <h2 className="text-[24px] font-bold text-[#171717] mt-1">
                    Contact Us
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("home")}
                  className="text-[12.5px] font-bold text-[#666] hover:text-[#171717] bg-[#f7f7f6] hover:bg-[#e2e2df] px-3 py-1.5 rounded transition cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
                <div className="p-4 bg-[#fafaf9] rounded border border-[#e2e2df] space-y-1.5">
                  <h4 className="font-bold text-[#171717]">Office of Dean (Academic Affairs)</h4>
                  <p className="text-[12px] text-[#666]">
                    National Institute of Technology Hamirpur<br />
                    Himachal Pradesh, India · 177005
                  </p>
                  <p className="text-[12px] text-[#171717] font-semibold">
                    Tel: +91-1972-254011 · dean.acad@example.test
                  </p>
                </div>

                <div className="p-4 bg-[#fafaf9] rounded border border-[#e2e2df] space-y-1.5">
                  <h4 className="font-bold text-[#171717]">Senate Doctoral Programme Committee</h4>
                  <p className="text-[12px] text-[#666]">
                    Academic Section, Administrative Block<br />
                    NIT Hamirpur
                  </p>
                  <p className="text-[12px] text-[#171717] font-semibold">
                    Email: sdpc@example.test
                  </p>
                </div>

                <div className="p-4 bg-[#fafaf9] rounded border border-[#e2e2df] space-y-1.5">
                  <h4 className="font-bold text-[#171717]">Department of Computer Science & Engg</h4>
                  <p className="text-[12px] text-[#666]">
                    Office of Head of Department (HOD CSE)<br />
                    CSE Department Building, NIT Hamirpur
                  </p>
                  <p className="text-[12px] text-[#171717] font-semibold">
                    Email: hod.cse@example.test
                  </p>
                </div>

                <div className="p-4 bg-[#fafaf9] rounded border border-[#e2e2df] space-y-1.5">
                  <h4 className="font-bold text-[#171717]">PRISMS Technical Support</h4>
                  <p className="text-[12px] text-[#666]">
                    Portal Helpdesk & System Support Team<br />
                    Operating hours: Mon-Fri 09:00 - 17:30 IST
                  </p>
                  <p className="text-[12px] text-[#16a34a] font-semibold">
                    Email: prisms-support@nith.ac.in
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab("home")}
                  className="text-[13px] font-bold text-[#666] hover:text-[#171717] cursor-pointer"
                >
                  ← Back to Home
                </button>
                <Link
                  href="/login"
                  className="bg-[#16a34a] hover:bg-[#15803d] text-white font-bold px-5 py-2 rounded text-[13px] transition"
                >
                  Sign In to Portal →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Institutional Footer (Figma 23:1462 Exact Match) */}
      <footer className="bg-white border-t border-[#e2e2df]">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 text-[13px]">
            {/* Column 1: About PRISMS (Figma 23:1464) */}
            <div className="space-y-3">
              <h4 className="font-bold text-[15px] text-[#171717]">About PRISMS</h4>
              <p className="text-[#666] leading-relaxed text-[12.5px]">
                PhD Research and Institutional Scholars Management System (PRISMS) coordinates doctoral admissions,
                coursework verification, supervision milestones, and statutory thesis evaluations at National Institute of Technology Hamirpur.
              </p>
            </div>

            {/* Column 2: Quick Links (Figma 23:1467) */}
            <div className="space-y-3">
              <h4 className="font-bold text-[15px] text-[#171717]">Quick Links</h4>
              <ul className="space-y-2 text-[#666]">
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveTab("home")}
                    className="hover:text-[#171717] hover:underline cursor-pointer text-left"
                  >
                    Portal Home
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveTab("about")}
                    className="hover:text-[#171717] hover:underline cursor-pointer text-left"
                  >
                    About PRISMS
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveTab("workflow")}
                    className="hover:text-[#171717] hover:underline cursor-pointer text-left"
                  >
                    Research Workflow
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveTab("guidelines")}
                    className="hover:text-[#171717] hover:underline cursor-pointer text-left"
                  >
                    Guidelines
                  </button>
                </li>
                <li>
                  <Link href="/login" className="hover:text-[#171717] hover:underline font-semibold text-[#16a34a]">
                    Sign In / Login
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Developers (Figma 23:1475) */}
            <div className="space-y-3">
              <h4 className="font-bold text-[15px] text-[#171717]">Developers</h4>
              <ul className="space-y-2 text-[12.5px] text-[#666]">
                <li>
                  <a
                    href="https://ankur-portfolio-topaz.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Ankur Gupta portfolio (opens in new tab)"
                    className="font-bold text-[#171717] hover:text-[#16a34a] hover:underline transition inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#daa32f] rounded"
                  >
                    <span>Ankur Gupta</span>
                    <span className="text-[10px] text-[#888]">↗</span>
                  </a>
                  <p className="text-[11.5px] text-[#666]">Department of Computer Science & Engineering</p>
                </li>
                <li>
                  <a
                    href="https://github.com/itzzadi04"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Aditya Sharma GitHub profile (opens in new tab)"
                    className="font-bold text-[#171717] hover:text-[#16a34a] hover:underline transition inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#daa32f] rounded"
                  >
                    <span>Aditya Sharma</span>
                    <span className="text-[10px] text-[#888]">↗</span>
                  </a>
                  <p className="text-[11.5px] text-[#666]">Department of Computer Science & Engineering</p>
                </li>
              </ul>
              <div className="pt-1">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="PRISMS Source Code Repository (opens in new tab)"
                  className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#171717] bg-[#f2f2f0] hover:bg-[#e2e2df] px-3 py-1.5 rounded transition focus:outline-none focus:ring-2 focus:ring-[#daa32f]"
                >
                  <span>Source code</span>
                  <span>↗</span>
                </a>
              </div>
            </div>

            {/* Column 4: Contact Us (Figma 23:1483) */}
            <div className="space-y-3">
              <h4 className="font-bold text-[15px] text-[#171717]">Contact Us</h4>
              <div className="space-y-2 text-[#666] text-[12.5px]">
                <p className="leading-snug flex items-start gap-2">
                  <svg className="w-4 h-4 text-[#888] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>
                    National Institute of Technology Hamirpur<br />
                    Himachal Pradesh, India · 177005
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#888] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href="mailto:prisms-support@nith.ac.in" className="hover:underline text-[#171717]">prisms-support@nith.ac.in</a>
                </p>
                <p className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#888] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>Office of Dean (Academic): +91-1972-254011</span>
                </p>
              </div>
            </div>
          </div>

          {/* Copyright Strip (Figma 23:1493) */}
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
