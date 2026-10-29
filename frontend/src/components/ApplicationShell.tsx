"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface ApplicationShellProps {
  portalType: "student" | "faculty";
  breadcrumb?: string;
  children: React.ReactNode;
}

export function ApplicationShell({ portalType, breadcrumb, children }: ApplicationShellProps) {
  const { user, activeRole, setActiveRole, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  // Student links
  const studentNavItems = [
    { label: "Dashboard", href: "/student/dashboard", icon: "/assets/icon-dashboard.svg" },
    { label: "My Profile", href: "/student/profile", icon: "/assets/icon-user.svg" },
    { label: "Research Details", href: "/student/research", icon: "/assets/icon-book.svg" },
    { label: "Thesis Submission", href: "/student/thesis/submit", icon: "/assets/icon-file-up.svg" },
    { label: "Submission History", href: "/student/thesis/history", icon: "/assets/icon-history.svg" },
    { label: "Documents & Guidelines", href: "/student/documents", icon: "/assets/icon-folder.svg" },
    { label: "Notifications (2)", href: "/student/notifications", icon: "/assets/icon-notifications.svg" },
    { label: "Help & Support", href: "/student/help", icon: "/assets/icon-home.svg" },
  ];

  // Faculty links
  const facultyNavItems = [
    { label: "Dashboard", href: "/faculty/dashboard", icon: "/assets/icon-dashboard.svg" },
    { label: "Approval Queue", href: "/faculty/queue", icon: "/assets/icon-user.svg" },
    { label: "Thesis Reviews", href: "/faculty/reviews", icon: "/assets/icon-book.svg" },
    { label: "My Research Scholars", href: "/faculty/scholars", icon: "/assets/icon-file-up.svg" },
    { label: "Activity History", href: "/faculty/history", icon: "/assets/icon-history.svg" },
    { label: "Notifications (2)", href: "/faculty/notifications", icon: "/assets/icon-notifications.svg" },
    { label: "Documents & Guidelines", href: "/faculty/documents", icon: "/assets/icon-folder.svg" },
    { label: "Help & Support", href: "/faculty/help", icon: "/assets/icon-home.svg" },
    { label: "Account Settings", href: "/faculty/settings", icon: "/assets/icon-signout.svg" },
  ];

  const navItems = portalType === "student" ? studentNavItems : facultyNavItems;

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "PR";

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f7f6] text-[#303030]">
      {/* 1. Institutional Header */}
      <header className="bg-white border-b border-[#e2e2df] px-4 md:px-12 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 md:w-14 md:h-14 shrink-0">
            <Image
              src="/assets/nith-emblem.png"
              alt="NIT Hamirpur Emblem"
              width={56}
              height={56}
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-devanagari text-[12px] md:text-[13px] text-[#737373] leading-none mb-0.5">
              राष्ट्रीय प्रौद्योगिकी संस्थान हमीरपुर
            </span>
            <span className="font-arimo font-bold text-[15px] md:text-[18px] text-[#171717] leading-tight">
              National Institute of Technology Hamirpur
            </span>
            <span className="font-arimo text-[10px] md:text-[11px] text-[#666666] leading-none mt-0.5">
              An Institute of National Importance · Ministry of Education, Govt. of India
            </span>
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-end text-right">
          <span className="font-arimo font-bold text-[18px] text-[#171717] leading-none">
            PRISMS
          </span>
          <span className="font-arimo text-[11px] text-[#303030] leading-tight mt-1">
            PhD Research & Institutional Scholars Management System
          </span>
        </div>
      </header>

      {/* 2. Institutional Gold Navigation Band */}
      <nav className="bg-[#daa32f] px-4 md:px-12 py-2 flex flex-wrap items-center justify-between text-[12.5px] font-arimo text-[#171717] shadow-sm">
        <div className="flex items-center gap-5 md:gap-7 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:underline font-semibold">
            Home
          </Link>
          <Link href="/?tab=about" className="hover:underline">
            About PRISMS
          </Link>
          <Link href="/?tab=workflow" className="hover:underline">
            Research Workflow
          </Link>
          <Link href="/?tab=guidelines" className="hover:underline">
            Guidelines
          </Link>
          <Link href="/?tab=contact" className="hover:underline">
            Contact Us
          </Link>
        </div>

        <div className="flex items-center gap-4 mt-1 sm:mt-0">
          {/* Multiple Roles Switcher */}
          {user && user.roles && user.roles.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="bg-[#171717] text-[#daa32f] px-2.5 py-0.5 rounded text-[11.5px] font-bold flex items-center gap-1 shadow-sm"
              >
                Role: {activeRole || user.roles[0].code} ▾
              </button>
              {roleMenuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-[#e2e2df] rounded shadow-lg z-50 py-1 text-[#303030]">
                  <div className="px-3 py-1 text-[11px] font-bold text-[#666] border-b border-[#f2f2f0]">
                    Select Active Role
                  </div>
                  {user.roles.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setActiveRole(r.code);
                        setRoleMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#f2f2f0] flex items-center justify-between ${
                        activeRole === r.code ? "font-bold text-[#166534] bg-[#edf8ef]" : ""
                      }`}
                    >
                      <span>{r.name}</span>
                      <span className="text-[10px] text-[#a3a3a3]">{r.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden md:inline font-medium text-[12px]">
                {user.fullName}
              </span>
              <button
                onClick={() => logout()}
                className="font-bold text-[#171717] hover:underline cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link href="/login" className="font-bold hover:underline">
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* 3. Main Application Body with Sidebar and Workspace */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Mobile Menu Toggle */}
        <div className="md:hidden bg-[#171717] p-2 flex justify-between items-center text-white">
          <span className="font-bold text-[#daa32f] text-sm">
            {portalType === "student" ? "STUDENT PORTAL" : "FACULTY PORTAL"}
          </span>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-xs bg-[#525252] text-[#daa32f] px-2 py-1 rounded"
          >
            {mobileMenuOpen ? "Close Menu" : "Menu ▾"}
          </button>
        </div>

        {/* Sidebar */}
        <aside
          className={`${
            mobileMenuOpen ? "block" : "hidden"
          } md:flex flex-col justify-between w-full md:w-[230px] shrink-0 bg-[#171717] text-white min-h-[640px]`}
        >
          <div className="p-4">
            <div className="mb-4 pb-3 border-b border-[#303030]">
              <span className="font-bold text-[19px] text-[#daa32f] block leading-tight">
                PRISMS
              </span>
              <span className="text-[10.5px] text-[#daa32f] font-semibold tracking-wider uppercase">
                {portalType === "student" ? "STUDENT PORTAL" : "FACULTY PORTAL"}
              </span>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-[5px] text-[13px] transition-colors ${
                      isActive
                        ? "bg-[#525252] border-l-[6px] border-[#daa32f] text-white font-bold"
                        : "text-[#a3a3a3] hover:text-white hover:bg-[#252525]"
                    }`}
                  >
                    <div className="relative w-4 h-4 shrink-0 opacity-80">
                      <Image
                        src={item.icon}
                        alt=""
                        width={16}
                        height={16}
                        className="object-contain invert"
                      />
                    </div>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Account Tile in Sidebar */}
          {user && (
            <div className="p-4 border-t border-[#303030] bg-[#1d1d1d] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#f2f2f0] border border-[#e2e2df] flex items-center justify-center font-bold text-[12px] text-[#303030] shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-bold text-white truncate leading-tight">
                  {user.fullName}
                </p>
                <p className="text-[11px] text-[#a3a3a3] truncate leading-tight mt-0.5">
                  {portalType === "student"
                    ? user.studentProfile?.rollNumber || "Scholar"
                    : activeRole || user.facultyProfile?.designation || "Faculty"}
                </p>
              </div>
            </div>
          )}
        </aside>

        {/* Workspace */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#f7f7f6]">
          {/* Top navigation workspace bar */}
          <div className="bg-white border-b border-[#e2e2df] px-6 py-3 flex items-center justify-between gap-4">
            <div className="text-[12.5px] text-[#666666] font-medium truncate">
              {breadcrumb || (portalType === "student" ? "Student portal / Dashboard" : "Faculty portal / Dashboard")}
            </div>

            <div className="flex items-center gap-3">
              {/* Global search */}
              <div className="hidden sm:flex items-center gap-2 bg-[#f7f7f6] border border-[#e2e2df] rounded-[7px] px-3 py-1.5 w-60">
                <Image src="/assets/icon-search.svg" alt="" width={14} height={14} className="opacity-60" />
                <input
                  type="text"
                  placeholder="Search portal"
                  className="bg-transparent text-[12px] text-[#303030] placeholder-[#666666] focus:outline-none w-full"
                />
              </div>

              {/* Notification bell */}
              <Link
                href={portalType === "student" ? "/student/notifications" : "/faculty/notifications"}
                className="flex items-center gap-1.5 text-[#166534] bg-[#edf8ef] px-2.5 py-1 rounded-[6px] hover:bg-[#e0f2e3] transition"
              >
                <Image src="/assets/icon-bell.svg" alt="" width={16} height={16} />
                <span className="font-bold text-[11px]">2</span>
              </Link>

              {/* Initials badge */}
              <div className="w-8 h-8 rounded-full bg-[#f2f2f0] border border-[#e2e2df] flex items-center justify-center font-bold text-[12px] text-[#303030]">
                {initials}
              </div>
            </div>
          </div>

          {/* Children View */}
          <div className="p-6 md:p-8 flex-1">{children}</div>
        </main>
      </div>

      {/* 4. Institutional Footer (Figma 23:1462 Exact Match) */}
      <footer className="bg-white border-t border-[#e2e2df] text-[#303030] text-[12.5px] font-arimo">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Column 1: About PRISMS */}
            <div className="space-y-3">
              <h4 className="font-bold text-[14px] text-[#171717]">About PRISMS</h4>
              <p className="text-[#666] leading-relaxed text-[12px]">
                PhD Research & Institutional Scholars Management System (PRISMS) coordinates doctoral admissions,
                supervision milestones, coursework verification, and statutory thesis evaluations at National Institute of Technology Hamirpur.
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div className="space-y-3">
              <h4 className="font-bold text-[14px] text-[#171717]">Quick Links</h4>
              <ul className="space-y-1.5 text-[12px] text-[#666]">
                <li>
                  <Link href="/" className="hover:text-[#171717] hover:underline">
                    Portal Home
                  </Link>
                </li>
                <li>
                  <Link href="/?tab=about" className="hover:text-[#171717] hover:underline">
                    About PRISMS
                  </Link>
                </li>
                <li>
                  <Link href="/?tab=workflow" className="hover:text-[#171717] hover:underline">
                    Research Workflow
                  </Link>
                </li>
                <li>
                  <Link href="/?tab=guidelines" className="hover:text-[#171717] hover:underline">
                    Guidelines
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Developers (Figma 23:1475) */}
            <div className="space-y-3">
              <h4 className="font-bold text-[14px] text-[#171717]">Developers</h4>
              <div className="space-y-1 text-[12px] text-[#666]">
                <p className="font-bold text-[#171717]">Ankur Gupta</p>
                <p>Department of Computer Science & Engineering</p>
                <p>National Institute of Technology Hamirpur</p>
              </div>
              <div className="pt-1.5">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[#171717] bg-[#f2f2f0] hover:bg-[#e2e2df] px-2.5 py-1 rounded transition"
                >
                  <span>Source code</span>
                  <span>↗</span>
                </a>
              </div>
            </div>

            {/* Column 4: Contact Us */}
            <div className="space-y-3">
              <h4 className="font-bold text-[14px] text-[#171717]">Contact Us</h4>
              <div className="space-y-1.5 text-[#666] text-[12px]">
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
          <div className="border-t border-[#f2f2f0] pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#737373] gap-2">
            <div>
              © 2026 National Institute of Technology Hamirpur. All rights reserved.
            </div>
            <div>
              PRISMS Academic Release · Designed from NIT Hamirpur Design System
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
