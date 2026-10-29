"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("student1@example.test");
  const [password, setPassword] = useState("ChangeMe-Dev-123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (accountEmail: string) => {
    setEmail(accountEmail);
    setPassword("ChangeMe-Dev-123");
    setError(null);
    setLoading(true);
    try {
      await login(accountEmail, "ChangeMe-Dev-123");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const sampleAccounts = [
    {
      role: "Student / Scholar",
      name: "Aarav Sharma",
      email: "student1@example.test",
      desc: "Roll: 21PHDCSE01 · Thesis Draft & Submissions",
      badgeColor: "bg-[#fbf3de] text-[#daa32f]",
    },
    {
      role: "Supervisor",
      name: "Dr. Rajesh Kumar",
      email: "supervisor1@example.test",
      desc: "Assigned Supervisor · Review & Scholar Tracking",
      badgeColor: "bg-[#eff6ff] text-[#2563eb]",
    },
    {
      role: "Head of Dept (HOD)",
      name: "Prof. Anil Verma",
      email: "hod.cse@example.test",
      desc: "CSE HOD · View-Only, Downloads Restricted",
      badgeColor: "bg-[#fffbeb] text-[#d97706]",
    },
    {
      role: "SDPC Chairperson",
      name: "Prof. Vikram Malhotra",
      email: "sdpc@example.test",
      desc: "Senate Doctoral Programme Committee",
      badgeColor: "bg-[#f5f3ff] text-[#7c3aed]",
    },
    {
      role: "Dean Academics",
      name: "Prof. Sanjay Gupta",
      email: "dean@example.test",
      desc: "Dean of Academic Affairs Approval",
      badgeColor: "bg-[#ecfdf5] text-[#059669]",
    },
    {
      role: "Senate Chair / Director",
      name: "Prof. H. M. Suryavanshi",
      email: "chairman@example.test",
      desc: "Director NIT Hamirpur · Final Senate Approval",
      badgeColor: "bg-[#f1f5f9] text-[#475569]",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f6] flex flex-col justify-between text-[#303030]">
      {/* Header */}
      <header className="bg-white border-b border-[#e2e2df] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition">
          <Image
            src="/assets/nith-emblem.png"
            alt="NIT Hamirpur"
            width={48}
            height={48}
            className="object-contain"
            priority
          />
          <div>
            <div className="text-[11.5px] text-[#737373] font-devanagari">
              राष्ट्रीय प्रौद्योगिकी संस्थान हमीरपुर
            </div>
            <div className="font-bold text-[16px] text-[#171717]">
              National Institute of Technology Hamirpur
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-[12.5px] font-bold text-[#666] hover:text-[#171717] hover:underline">
            ← Back to Home
          </Link>
          <div className="text-right border-l border-[#e2e2df] pl-4">
            <div className="font-bold text-[18px] text-[#daa32f]">PRISMS</div>
            <div className="text-[11px] text-[#666]">PhD Portal Access</div>
          </div>
        </div>
      </header>

      {/* Main card */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Sign In Form */}
          <div className="md:col-span-6 bg-white border border-[#e2e2df] rounded-[8px] p-8 shadow-sm">
            <div className="mb-6">
              <h1 className="font-bold text-[22px] text-[#171717] mb-1">Sign In to PRISMS</h1>
              <p className="text-[13px] text-[#666]">
                PhD Research & Institutional Scholars Management System
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-[#fff1ef] border border-[#b42318] text-[#b42318] text-[13px] rounded-[6px]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[12.5px] font-bold text-[#171717] mb-1">
                  Institutional Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#f7f7f6] border border-[#e2e2df] rounded-[6px] px-3 py-2 text-[13.5px] text-[#171717] focus:outline-none focus:border-[#daa32f]"
                  placeholder="user@example.test"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[12.5px] font-bold text-[#171717]">
                    Password
                  </label>
                  <span className="text-[11px] text-[#888] font-mono">
                    Default: ChangeMe-Dev-123
                  </span>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#f7f7f6] border border-[#e2e2df] rounded-[6px] px-3 py-2 text-[13.5px] text-[#171717] focus:outline-none focus:border-[#daa32f]"
                  placeholder="••••••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#16a34a] hover:bg-[#15803d] text-white font-bold py-2.5 rounded-[7px] text-[13.5px] transition cursor-pointer disabled:opacity-60 shadow-sm"
              >
                {loading ? "Signing in..." : "Sign In to Portal"}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#f2f2f0] text-center">
              <p className="text-[12px] text-[#666]">
                Need help accessing your scholar or faculty account?{" "}
                <Link href="/contact" className="text-[#16a34a] font-bold hover:underline">
                  Contact Support
                </Link>
              </p>
            </div>
          </div>

          {/* Quick Demo Accounts */}
          <div className="md:col-span-6 space-y-3">
            <div className="bg-[#fbf3de] border border-[#daa32f]/30 rounded-[8px] p-4 text-[12.5px]">
              <div className="font-bold text-[#171717] flex items-center gap-1.5 mb-1">
                <span>⚡</span> One-Click Demo Accounts
              </div>
              <p className="text-[#666] leading-relaxed">
                Click any role card below to instantly authenticate and test the full institutional workflow.
              </p>
            </div>

            <div className="space-y-2.5">
              {sampleAccounts.map((acc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleQuickLogin(acc.email)}
                  disabled={loading}
                  className="w-full text-left bg-white border border-[#e2e2df] hover:border-[#daa32f] rounded-[8px] p-3.5 transition group cursor-pointer shadow-sm hover:shadow"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded ${acc.badgeColor}`}>
                      {acc.role}
                    </span>
                    <span className="text-[11.5px] font-bold text-[#16a34a] opacity-0 group-hover:opacity-100 transition">
                      Sign In →
                    </span>
                  </div>
                  <div className="font-bold text-[13.5px] text-[#171717]">
                    {acc.name}
                  </div>
                  <div className="text-[11.5px] text-[#666] font-mono mt-0.5">
                    {acc.email}
                  </div>
                  <div className="text-[11px] text-[#888] mt-1">
                    {acc.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[12px] text-[#737373] py-4 border-t border-[#e2e2df] bg-white">
        National Institute of Technology Hamirpur · PRISMS Doctoral Portal · Default password: <code className="bg-[#f2f2f0] px-1 py-0.5 rounded font-mono text-[11px]">ChangeMe-Dev-123</code>
      </footer>
    </div>
  );
}
