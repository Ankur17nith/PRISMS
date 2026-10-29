"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { ApplicationShell } from "@/components/ApplicationShell";
import { useAuth } from "@/lib/auth";
import { api, SubmissionItem } from "@/lib/api";
import { formatDateTime, formatStatusLabel, getStatusBadgeClasses } from "@/lib/statusHelper";

export default function ScholarHistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { activeRole } = useAuth();
  const [data, setData] = useState<{ scholar: unknown; submissions: SubmissionItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id || id === "undefined") {
        setError("Invalid scholar identifier provided.");
        setLoading(false);
        return;
      }
      try {
        const res = await api.getScholarHistory(id, activeRole || undefined);
        setData(res);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, activeRole]);

  if (loading) {
    return (
      <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / Scholar Record">
        <div className="p-8 text-center text-[#666]">Loading scholar history record...</div>
      </ApplicationShell>
    );
  }

  if (error || !data || !data.scholar) {
    return (
      <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / Scholar Record">
        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 text-center">
          <p className="text-[14px] text-[#b42318] font-bold mb-2">{error || "Scholar record not found"}</p>
          <Link href="/faculty/scholars" className="text-[13px] text-[#16a34a] hover:underline font-bold">
            ← Return to Scholars List
          </Link>
        </div>
      </ApplicationShell>
    );
  }

  // Cast scholar to known fields
  const scholarObj = (data.scholar || {}) as {
    rollNumber?: string;
    fullName?: string;
    program?: string;
    collegeEmail?: string;
    user?: { fullName?: string; collegeEmail?: string };
    department?: { name?: string; code?: string };
  };

  const scholarFullName = scholarObj.fullName || scholarObj.user?.fullName || "Scholar Record";
  const scholarRoll = scholarObj.rollNumber || "N/A";
  const scholarProgram = scholarObj.program || "PhD";
  const deptName = scholarObj.department?.name || "Computer Science and Engineering";

  return (
    <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / Scholar Record">
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between border-b border-[#e2e2df] pb-4">
          <div>
            <Link
              href="/faculty/scholars"
              className="text-[12px] text-[#666] hover:text-[#171717] font-semibold"
            >
              ← Back to All Scholars
            </Link>
            <h1 className="text-[26px] font-bold text-[#171717] mt-1">
              {scholarFullName}
            </h1>
            <p className="text-[13px] text-[#666]">
              Roll: <span className="font-bold text-[#171717]">{scholarRoll}</span> · {scholarProgram} ·
              Dept. of {deptName}
            </p>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-4">
          <h2 className="text-[16px] font-bold text-[#171717] border-b border-[#f2f2f0] pb-2">
            Thesis Submissions & Retained Versions
          </h2>

          {data.submissions.length === 0 ? (
            <p className="text-[13px] text-[#666]">No thesis submissions recorded for this scholar.</p>
          ) : (
            <div className="space-y-4">
              {data.submissions.map((sub) => (
                <div key={sub.id} className="border border-[#e2e2df] rounded-[6px] p-4 bg-[#fafaf9] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2e2df] pb-2">
                    <div>
                      <span className="font-mono font-bold text-[14px] text-[#171717]">
                        {sub.submissionReference} (v{sub.currentVersion})
                      </span>
                      <p className="text-[14px] font-bold text-[#171717] mt-0.5">{sub.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11.5px] font-bold px-2.5 py-0.5 rounded ${getStatusBadgeClasses(sub.status)}`}
                      >
                        {formatStatusLabel(sub.status)}
                      </span>
                      <Link
                        href={`/faculty/thesis/reader/${sub.id}`}
                        className="bg-[#171717] hover:bg-[#333] text-white text-[12px] font-bold px-3 py-1 rounded transition flex items-center gap-1.5 shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>View in Reader</span>
                      </Link>
                      <Link
                        href={`/faculty/reviews/${sub.id}`}
                        className="bg-[#16a34a] hover:bg-[#15803d] text-white text-[12px] font-bold px-3 py-1 rounded shadow-sm"
                      >
                        Inspect Review Workspace →
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px] text-[#666]">
                    <div>
                      <span>Submitted Date (IST): </span>
                      <span className="font-semibold text-[#171717]">
                        {sub.submittedAt ? formatDateTime(sub.submittedAt) : "Draft"}
                      </span>
                    </div>
                    <div>
                      <span>Retained Files: </span>
                      <span className="font-semibold text-[#171717]">
                        {sub.files?.length || 0} version files preserved
                      </span>
                    </div>
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
