"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ApplicationShell } from "@/components/ApplicationShell";
import { useAuth } from "@/lib/auth";
import { api, ReviewQueueItem, ScholarItem } from "@/lib/api";

export default function FacultyDashboardPage() {
  const { user, activeRole } = useAuth();
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [scholars, setScholars] = useState<ScholarItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [q, s] = await Promise.all([
          api.getReviewQueue(activeRole || undefined).catch(() => []),
          api.getMyScholars(activeRole || undefined).catch(() => []),
        ]);
        setQueue(Array.isArray(q) ? q : []);
        setScholars(Array.isArray(s) ? s : []);
      } catch {
        setQueue([]);
        setScholars([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeRole]);

  const isHod = activeRole === "HOD";
  const isSupervisor = activeRole === "SUPERVISOR";
  const isSdpc = activeRole === "CHAIRPERSON_SDPC" || activeRole === "SDPC";
  const isDean = activeRole === "DEAN_ACADEMICS" || activeRole === "DEAN";
  const isSenate = activeRole === "CHAIRPERSON_SENATE" || activeRole === "CHAIRMAN";

  const portalBreadcrumb = isHod
    ? "HOD Portal / Departmental Review"
    : isSdpc
    ? "SDPC Portal / Committee Review"
    : isDean
    ? "Dean Academics / Statutory Approvals"
    : isSenate
    ? "Senate Portal / Final Approvals"
    : "Supervisor Portal / Dashboard";

  return (
    <ApplicationShell portalType="faculty" breadcrumb={portalBreadcrumb}>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e2e2df] pb-4">
          <div>
            <h1 className="text-[26px] font-bold text-[#171717]">
              {isHod
                ? "Head of Department (CSE) Dashboard"
                : isSdpc
                ? "SDPC Chairperson Dashboard"
                : isDean
                ? "Dean (Academic Affairs) Dashboard"
                : isSenate
                ? "Senate Chairperson / Director Dashboard"
                : "Thesis Supervisor Dashboard"}
            </h1>
            <p className="text-[13.5px] text-[#666]">
              Welcome back, {user?.fullName || "Faculty Member"}. Signed in under role:{" "}
              <span className="font-bold text-[#daa32f]">{activeRole || "SUPERVISOR"}</span>.
            </p>
          </div>

          <span
            className={`self-start sm:self-auto text-[11.5px] font-bold px-3 py-1 rounded-[6px] ${
              isHod
                ? "bg-[#fffbeb] text-[#b45309] border border-[#fde68a]"
                : isSupervisor
                ? "bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]"
                : "bg-[#f5f3ff] text-[#6d28d9] border border-[#ddd6fe]"
            }`}
          >
            {isHod
              ? "HOD Oversight Mode"
              : isSupervisor
              ? "Supervisory Mode"
              : "Institute Authority Mode"}
          </span>
        </div>

        {/* Role-Specific Institutional Status Banner */}
        {isHod && (
          <div className="p-4 bg-[#fffbeb] border border-[#fde68a] rounded-[8px] text-[13px] text-[#92400e] flex items-start gap-3">
            <span className="text-[18px]">⚖️</span>
            <div>
              <strong className="block text-[13.5px] text-[#78350f] mb-0.5">
                Departmental Academic Oversight Mode Active
              </strong>
              <p className="leading-relaxed">
                As Head of Department (CSE), your statutory authority is to evaluate and forward or return doctoral theses. In strict accordance with NIT Hamirpur regulations, direct document downloading is restricted in this review mode.
              </p>
            </div>
          </div>
        )}

        {isSupervisor && (
          <div className="p-4 bg-[#eff6ff] border border-[#bfdbfe] rounded-[8px] text-[13px] text-[#1e40af] flex items-start gap-3">
            <span className="text-[18px]">👨‍🏫</span>
            <div>
              <strong className="block text-[13.5px] text-[#1e3a8a] mb-0.5">
                Doctoral Supervision Portal Active
              </strong>
              <p className="leading-relaxed">
                Direct scholar supervision: evaluate dissertation drafts, provide guidance notes, and endorse initial thesis submissions for your assigned research scholars. Full document inspection and download permissions are enabled.
              </p>
            </div>
          </div>
        )}

        {/* Top metrics summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm">
            <span className="text-[12px] font-bold text-[#666] uppercase">
              {isHod ? "Dept. Reviews" : isSdpc ? "SDPC Reviews" : isDean ? "Dean Reviews" : isSenate ? "Senate Queue" : "Pending Reviews"}
            </span>
            <p className="text-[28px] font-bold text-[#171717] mt-1">{(Array.isArray(queue) ? queue : []).length}</p>
            <p className="text-[11.5px] text-[#8a570d] font-semibold mt-0.5">Tasks requiring decision</p>
          </div>

          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm">
            <span className="text-[12px] font-bold text-[#666] uppercase">
              {isHod ? "Dept. Scholars" : "Supervised Scholars"}
            </span>
            <p className="text-[28px] font-bold text-[#171717] mt-1">
              {(Array.isArray(scholars) ? scholars : []).filter((s) => s.admissionStatus === "ACTIVE" || s.admissionStatus === "CONFIRMED").length}
            </p>
            <p className="text-[11.5px] text-[#166534] font-semibold mt-0.5">
              {isHod ? "CSE Department total" : "Under your supervision"}
            </p>
          </div>

          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm">
            <span className="text-[12px] font-bold text-[#666] uppercase">Active Role</span>
            <p className="text-[18px] font-bold text-[#daa32f] mt-2 truncate">
              {activeRole || "SUPERVISOR"}
            </p>
            <p className="text-[11.5px] text-[#666] mt-0.5">Current Authority Context</p>
          </div>

          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm">
            <span className="text-[12px] font-bold text-[#666] uppercase">Document Policy</span>
            <p className={`text-[16px] font-bold mt-2 truncate ${isHod ? "text-[#b45309]" : "text-[#166534]"}`}>
              {isHod ? "View-Only (Restricted)" : "Full Access (Downloadable)"}
            </p>
            <p className="text-[11.5px] text-[#666] mt-0.5">
              {isHod ? "Downloads Prohibited" : "PDF Downloads Allowed"}
            </p>
          </div>
        </div>

        {/* Review Queue preview */}
        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#f2f2f0] pb-3">
            <div>
              <h2 className="text-[17px] font-bold text-[#171717]">Pending Thesis Review Queue</h2>
              <p className="text-[12.5px] text-[#666]">
                Submissions awaiting review under role: <span className="font-bold text-[#171717]">{activeRole || "SUPERVISOR"}</span>
              </p>
            </div>
            <Link
              href="/faculty/queue"
              className="text-[13px] font-bold text-[#16a34a] hover:underline"
            >
              View Full Queue →
            </Link>
          </div>

          {loading ? (
            <p className="text-[#666] text-[13px] py-4 text-center">Loading review tasks...</p>
          ) : (Array.isArray(queue) ? queue : []).length === 0 ? (
            <div className="p-8 text-center bg-[#fafaf9] rounded border border-dashed border-[#e2e2df]">
              <p className="text-[13.5px] text-[#666]">No pending review tasks in your queue.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-[#f7f7f6] text-[#666] font-bold border-b border-[#e2e2df]">
                  <tr>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3">Scholar</th>
                    <th className="py-2.5 px-3">Thesis Title</th>
                    <th className="py-2.5 px-3">Stage</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2f2f0]">
                  {(Array.isArray(queue) ? queue : []).slice(0, 5).map((q) => (
                    <tr key={q.assignmentId} className="hover:bg-[#fafaf9]">
                      <td className="py-3 px-3 font-mono font-bold text-[#171717]">
                        {q.submission.submissionReference} (v{q.submission.currentVersion})
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-[#171717] block">{q.submission.student.user.fullName}</span>
                        <span className="text-[11px] text-[#666]">{q.submission.student.rollNumber}</span>
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate text-[#171717] font-medium">
                        {q.submission.title}
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-[#fff7e6] text-[#8a570d] text-[11px] font-bold px-2 py-0.5 rounded">
                          {q.stage.name}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href={
                            activeRole === "HOD"
                              ? `/faculty/reviews/${q.submission.id}/hod`
                              : `/faculty/reviews/${q.submission.id}`
                          }
                          className="bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-[12px] px-3 py-1.5 rounded transition inline-block"
                        >
                          Review Now →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Supervised scholars quick table */}
        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#f2f2f0] pb-3">
            <div>
              <h2 className="text-[17px] font-bold text-[#171717]">My Research Scholars</h2>
              <p className="text-[12.5px] text-[#666]">Doctoral students under your academic supervision.</p>
            </div>
            <Link
              href="/faculty/scholars"
              className="text-[13px] font-bold text-[#16a34a] hover:underline"
            >
              Scholar Tracking Dashboard →
            </Link>
          </div>

          {scholars.length === 0 ? (
            <p className="text-[13px] text-[#666]">No assigned research scholars on record.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scholars.map((s, idx) => {
                const sid = s.scholarId || s.studentId || s.rollNumber || `scholar-${idx}`;
                const targetId = s.scholarId || s.studentId;
                return (
                  <div key={sid} className="p-4 border border-[#e2e2df] rounded-[6px] bg-[#fafaf9]">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-[14px] text-[#171717]">{s.fullName}</h4>
                        <p className="text-[12px] text-[#666]">Roll: {s.rollNumber} · {s.program}</p>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#edf8ef] text-[#166534]">
                        {s.admissionStatus}
                      </span>
                    </div>
                    <div className="mt-3 pt-2 border-t border-[#e2e2df] flex items-center justify-between text-[12px]">
                      <span className="text-[#666]">
                        {s.activeSubmission ? `Thesis: ${s.activeSubmission.status}` : "No active submission"}
                      </span>
                      {targetId ? (
                        <Link
                          href={`/faculty/scholars/${targetId}`}
                          className="font-bold text-[#16a34a] hover:underline"
                        >
                          View Scholar Record →
                        </Link>
                      ) : (
                        <span className="text-[#999] italic">Record unavailable</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ApplicationShell>
  );
}
