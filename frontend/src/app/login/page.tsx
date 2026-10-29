"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("student1@nith.ac.in");
  const [password, setPassword] = useState("Password123!");
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

  const sampleAccounts = [
    { label: "Rahul Sharma (Scholar)", email: "student1@nith.ac.in" },
    { label: "Dr. Alok Verma (Supervisor)", email: "supervisor1@nith.ac.in" },
    { label: "Dr. Meera Sen (HOD CSE)", email: "hod_cse@nith.ac.in" },
    { label: "Dr. Rajesh Sharma (SDPC)", email: "sdpc_chair@nith.ac.in" },
    { label: "Director (Senate Chair)", email: "senate_chair@nith.ac.in" },
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f6] flex flex-col justify-between text-[#303030]">
      {/* Header */}
      <header className="bg-white border-b border-[#e2e2df] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
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
        </div>
        <div className="text-right">
          <div className="font-bold text-[18px] text-[#daa32f]">PRISMS</div>
          <div className="text-[11px] text-[#666]">PhD Portal Access</div>
        </div>
      </header>

      {/* Main card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-8 w-full max-w-md shadow-sm">
          <div className="text-center mb-6">
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
                Institutional Email (@nith.ac.in)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#f7f7f6] border border-[#e2e2df] rounded-[6px] px-3 py-2 text-[13.5px] text-[#171717] focus:outline-none focus:border-[#daa32f]"
                placeholder="roll_or_emp@nith.ac.in"
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-bold text-[#171717] mb-1">
                Password
              </label>
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
              className="w-full bg-[#16a34a] hover:bg-[#15803d] text-white font-bold py-2.5 rounded-[7px] text-[13.5px] transition cursor-pointer disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In to Portal"}
            </button>
          </form>

          {/* Quick account switch for testing */}
          <div className="mt-6 pt-5 border-t border-[#e2e2df]">
            <p className="text-[11.5px] font-bold text-[#666] mb-2">Development Demo Accounts:</p>
            <div className="grid grid-cols-1 gap-1.5">
              {sampleAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword("Password123!");
                  }}
                  className={`text-left text-[11.5px] px-2.5 py-1.5 rounded transition ${
                    email === acc.email
                      ? "bg-[#edf8ef] text-[#166534] font-bold border border-[#16a34a]"
                      : "bg-[#f2f2f0] text-[#303030] hover:bg-[#e2e2df]"
                  }`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-[#737373] py-4 border-t border-[#e2e2df]">
        National Institute of Technology Hamirpur · PRISMS Portal
      </footer>
    </div>
  );
}
