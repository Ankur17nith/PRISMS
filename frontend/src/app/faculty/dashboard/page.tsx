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
          api.getMyScholars().catch(() => []),
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

  return (
    <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / Dashboard">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Title */}
        <div>
          <h1 className="text-[26px] font-bold text-[#171717]">Faculty Dashboard</h1>
          <p className="text-[14px] text-[#666]">
            Welcome back, {user?.fullName || "Faculty Member"}. Academic review tasks and scholar supervision.
          </p>
        </div>

        {/* Top metrics summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm">
            <span className="text-[12px] font-bold text-[#666] uppercase">Pending Reviews</span>
            <p className="text-[28px] font-bold text-[#171717] mt-1">{(Array.isArray(queue) ? queue : []).length}</p>
            <p className="text-[11.5px] text-[#8a570d] font-semibold mt-0.5">Tasks requiring decision</p>
          </div>

          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm">
            <span className="text-[12px] font-bold text-[#666] uppercase">Active Scholars</span>
            <p className="text-[28px] font-bold text-[#171717] mt-1">
              {(Array.isArray(scholars) ? scholars : []).filter((s) => s.admissionStatus === "ACTIVE" || s.admissionStatus === "CONFIRMED").length}
            </p>
            <p className="text-[11.5px] text-[#166534] font-semibold mt-0.5">Under your supervision</p>
          </div>

          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm">
            <span className="text-[12px] font-bold text-[#666] uppercase">Acting Authority</span>
            <p className="text-[18px] font-bold text-[#daa32f] mt-2 truncate">
              {activeRole || "SUPERVISOR"}
            </p>
            <p className="text-[11.5px] text-[#666] mt-0.5">Active Role Context</p>
          </div>

          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm">
            <span className="text-[12px] font-bold text-[#666] uppercase">Department</span>
            <p className="text-[18px] font-bold text-[#171717] mt-2 truncate">
              {user?.facultyProfile?.department?.code || "CSE"}
            </p>
            <p className="text-[11.5px] text-[#666] mt-0.5">Computer Science & Engg</p>
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
              {scholars.map((s) => (
                <div key={s.scholarId} className="p-4 border border-[#e2e2df] rounded-[6px] bg-[#fafaf9]">
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
                    <Link
                      href={`/faculty/scholars/${s.scholarId}`}
                      className="font-bold text-[#16a34a] hover:underline"
                    >
                      View Scholar Record →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ApplicationShell>
  );
}
