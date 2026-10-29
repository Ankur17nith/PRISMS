"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ApplicationShell } from "@/components/ApplicationShell";
import { api, ScholarItem } from "@/lib/api";

export default function FacultyScholarsPage() {
  const [scholars, setScholars] = useState<ScholarItem[]>([]);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const s = await api.getMyScholars();
        setScholars(s);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const scholarList = Array.isArray(scholars) ? scholars : [];

  const filtered = scholarList.filter((s) => {
    const matchesFilter =
      filter === "ALL"
        ? true
        : filter === "ACTIVE"
        ? s.admissionStatus === "ACTIVE"
        : s.admissionStatus === "COMPLETED";
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / My Research Scholars">
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold text-[#171717]">My Research Scholars</h1>
            <p className="text-[14px] text-[#666]">
              Supervision dashboard tracking doctoral research milestones and thesis progress.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-[#f2f2f0] p-1 rounded-[6px] text-[12px] font-bold">
              <button
                onClick={() => setFilter("ALL")}
                className={`px-3 py-1 rounded-[4px] ${filter === "ALL" ? "bg-white text-[#171717] shadow-sm" : "text-[#666]"}`}
              >
                All ({scholarList.length})
              </button>
              <button
                onClick={() => setFilter("ACTIVE")}
                className={`px-3 py-1 rounded-[4px] ${filter === "ACTIVE" ? "bg-white text-[#171717] shadow-sm" : "text-[#666]"}`}
              >
                Active ({scholarList.filter((s) => s.admissionStatus === "ACTIVE").length})
              </button>
              <button
                onClick={() => setFilter("COMPLETED")}
                className={`px-3 py-1 rounded-[4px] ${filter === "COMPLETED" ? "bg-white text-[#171717] shadow-sm" : "text-[#666]"}`}
              >
                Completed ({scholarList.filter((s) => s.admissionStatus === "COMPLETED").length})
              </button>
            </div>

            <input
              type="text"
              placeholder="Search scholar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-[#e2e2df] rounded-[6px] px-3 py-1.5 text-[12.5px] text-[#171717] focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#666]">Loading scholars list...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-8 text-center shadow-sm">
            <p className="text-[14px] text-[#666]">No research scholars found matching criteria.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#e2e2df] rounded-[8px] shadow-sm overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#f7f7f6] text-[#666] font-bold border-b border-[#e2e2df]">
                <tr>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Scholar Name</th>
                  <th className="py-3 px-4">Programme</th>
                  <th className="py-3 px-4">Admission Status</th>
                  <th className="py-3 px-4">Active Thesis</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f2f0]">
                {filtered.map((s, idx) => {
                  const sid = s.scholarId || s.studentId || s.rollNumber || `scholar-${idx}`;
                  const targetId = s.scholarId || s.studentId;
                  return (
                    <tr key={sid} className="hover:bg-[#fafaf9]">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#171717]">{s.rollNumber}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#171717] block">{s.fullName}</span>
                        <span className="text-[11px] text-[#666]">{s.collegeEmail}</span>
                      </td>
                      <td className="py-3.5 px-4 text-[#666]">{s.program}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            s.admissionStatus === "ACTIVE"
                              ? "bg-[#edf8ef] text-[#166534]"
                              : "bg-[#f2f2f0] text-[#666]"
                          }`}
                        >
                          {s.admissionStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {s.activeSubmission ? (
                          <div>
                            <span className="font-mono text-[12px] font-bold text-[#171717]">
                              {s.activeSubmission.submissionReference} (v{s.activeSubmission.currentVersion})
                            </span>
                            <span className="block text-[11px] text-[#666] truncate max-w-xs">
                              {s.activeSubmission.title}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-[#a3a3a3]">No submission yet</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {s.activeSubmission?.currentStage ? (
                          <span className="bg-[#fff7e6] text-[#8a570d] text-[11px] font-bold px-2 py-0.5 rounded">
                            {s.activeSubmission.currentStage}
                          </span>
                        ) : (
                          <span className="text-[12px] text-[#a3a3a3]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {targetId ? (
                          <Link
                            href={`/faculty/scholars/${targetId}`}
                            className="font-bold text-[12.5px] text-[#16a34a] hover:underline"
                          >
                            View Full History →
                          </Link>
                        ) : (
                          <span className="text-[#999] text-[12px] italic">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ApplicationShell>
  );
}
