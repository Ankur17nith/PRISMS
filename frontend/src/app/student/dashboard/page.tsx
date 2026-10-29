"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ApplicationShell } from "@/components/ApplicationShell";
import { useAuth } from "@/lib/auth";
import { api, SubmissionItem } from "@/lib/api";
import { formatDateTime, formatStatusLabel } from "@/lib/statusHelper";

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [draftData, setDraftData] = useState<{
    supervisor: { id: string; fullName: string; designation: string } | null;
    draft: { title: string; abstract?: string; keywords: string[] } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [subs, draft] = await Promise.all([
          api.getMySubmissions().catch(() => []),
          api.getDraft().catch(() => null),
        ]);
        setSubmissions(Array.isArray(subs) ? subs : []);
        setDraftData(
          draft
            ? {
                supervisor: draft.supervisor ? { id: draft.supervisor.id || "fac-1", fullName: draft.supervisor.fullName, designation: draft.supervisor.designation } : null,
                draft: draft.draft ? { title: draft.draft.title, abstract: draft.draft.abstract, keywords: draft.draft.keywords } : null,
              }
            : null
        );
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const latestSubmission = submissions.length > 0 ? submissions[0] : null;

  return (
    <ApplicationShell portalType="student" breadcrumb="Student portal / Dashboard">
      <div className="space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-[26px] font-bold text-[#171717] leading-tight">Dashboard</h1>
          <p className="text-[14px] text-[#666666] leading-relaxed">
            Overview of your doctoral profile and thesis submission.
          </p>
        </div>

        {/* Welcome Card matching Figma 89:121 */}
        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-[19px] font-bold text-[#171717]">
              Welcome back, {user?.fullName || "Research Scholar"}
            </h2>
            <p className="text-[12px] text-[#666666]">
              {user?.studentProfile?.rollNumber || "25PHD001"} · PhD · Department of{" "}
              {user?.studentProfile?.department?.name || "Computer Science and Engineering"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="bg-[#f2f2f0] text-[#303030] text-[11.5px] font-bold px-3 py-1.5 rounded-[4px]">
              Profile on record
            </span>

            {latestSubmission ? (
              <Link
                href={`/student/thesis/details?id=${latestSubmission.id}`}
                className="bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-[13px] px-4 py-2.5 rounded-[7px] flex items-center gap-2 transition"
              >
                <span>View Submission</span>
                <span>→</span>
              </Link>
            ) : (
              <Link
                href="/student/thesis/submit"
                className="bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-[13px] px-4 py-2.5 rounded-[7px] flex items-center gap-2 transition"
              >
                <span>Submit Thesis</span>
                <span>→</span>
              </Link>
            )}
          </div>
        </div>

        {/* Active Thesis Status Banner */}
        {latestSubmission ? (
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f2f2f0] pb-3">
              <div>
                <span className="text-[12px] font-bold text-[#666666] uppercase tracking-wider">
                  Active Submission Reference
                </span>
                <h3 className="text-[18px] font-bold text-[#171717]">
                  {latestSubmission.submissionReference} (Version {latestSubmission.currentVersion})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[12px] font-bold px-3 py-1 rounded-[4px] ${
                    latestSubmission.status === "APPROVED"
                      ? "bg-[#edf8ef] text-[#166534]"
                      : latestSubmission.status === "REVISION_REQUIRED"
                      ? "bg-[#fff7e6] text-[#8a570d]"
                      : latestSubmission.status === "REJECTED"
                      ? "bg-[#fff1ef] text-[#b42318]"
                      : "bg-[#edf8ef] text-[#166534]"
                  }`}
                >
                  {formatStatusLabel(latestSubmission.status)}
                </span>
              </div>
            </div>

            <div>
              <p className="text-[12px] font-semibold text-[#666]">Title of Dissertation</p>
              <p className="text-[15px] font-bold text-[#171717] mt-0.5">{latestSubmission.title}</p>
            </div>

            {latestSubmission.status === "REVISION_REQUIRED" && (
              <div className="bg-[#fff7e6] border-l-4 border-[#daa32f] p-4 rounded text-[13px] text-[#8a570d] space-y-1">
                <p className="font-bold">Revision Required by Review Committee</p>
                <p>
                  Your submission was returned for revision. Please review the remarks below and submit an updated
                  Version {latestSubmission.currentVersion + 1}.
                </p>
                <div className="pt-2">
                  <Link
                    href={`/student/thesis/submit?resubmit=${latestSubmission.id}`}
                    className="inline-block bg-[#daa32f] text-white font-bold px-4 py-2 rounded text-[12.5px] hover:bg-[#c49228]"
                  >
                    Resubmit Revised Thesis (v{latestSubmission.currentVersion + 1}) →
                  </Link>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-[12.5px]">
              <div>
                <span className="text-[#666]">Submitted On:</span>
                <p className="font-semibold text-[#171717]">
                  {latestSubmission.submittedAt ? formatDateTime(latestSubmission.submittedAt) : "Draft"}
                </p>
              </div>
              <div>
                <span className="text-[#666]">Assigned Supervisor:</span>
                <p className="font-semibold text-[#171717]">
                  {draftData?.supervisor?.fullName || "Dr. Alok Verma"}
                </p>
              </div>
              <div>
                <span className="text-[#666]">Academic Department:</span>
                <p className="font-semibold text-[#171717]">
                  {user?.studentProfile?.department?.name || "Computer Science and Engineering"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm">
            <h3 className="text-[16px] font-bold text-[#171717] mb-2">No Active Submissions Found</h3>
            <p className="text-[13px] text-[#666] mb-4">
              You have not submitted a PhD thesis yet. You can prepare and upload your doctoral thesis draft below.
            </p>
            <Link
              href="/student/thesis/submit"
              className="inline-flex items-center gap-2 bg-[#16a34a] text-white font-bold px-4 py-2.5 rounded-[7px] text-[13px] hover:bg-[#15803d]"
            >
              <span>Begin Thesis Submission</span>
              <span>→</span>
            </Link>
          </div>
        )}

        {/* Milestone Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Research Milestones */}
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-4">
            <h3 className="text-[16px] font-bold text-[#171717] border-b border-[#f2f2f0] pb-2">
              PhD Milestones & Progress
            </h3>
            <div className="space-y-3 text-[13px]">
              <div className="flex items-center justify-between p-2.5 bg-[#edf8ef] rounded">
                <span className="font-medium text-[#166534]">1. Coursework & Comprehensive Exam</span>
                <span className="font-bold text-[#166534]">Completed ✓</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#edf8ef] rounded">
                <span className="font-medium text-[#166534]">2. Research Proposal & State of Art</span>
                <span className="font-bold text-[#166534]">Approved ✓</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#edf8ef] rounded">
                <span className="font-medium text-[#166534]">3. Pre-PhD Seminar / Synopsis</span>
                <span className="font-bold text-[#166534]">Completed ✓</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#fff7e6] rounded">
                <span className="font-medium text-[#8a570d]">4. Final Thesis Submission & Defense</span>
                <span className="font-bold text-[#8a570d]">
                  {latestSubmission ? latestSubmission.status.replace(/_/g, " ") : "Pending"}
                </span>
              </div>
            </div>
          </div>

          {/* Supervisor Information */}
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-4">
            <h3 className="text-[16px] font-bold text-[#171717] border-b border-[#f2f2f0] pb-2">
              Supervision & Committee
            </h3>
            <div className="space-y-3 text-[13px]">
              <div className="border border-[#e2e2df] rounded p-3">
                <span className="text-[11px] font-bold text-[#666] uppercase block">Principal Supervisor</span>
                <p className="font-bold text-[14px] text-[#171717] mt-0.5">
                  {draftData?.supervisor?.fullName || "Dr. Alok Verma"}
                </p>
                <p className="text-[12px] text-[#666]">
                  {draftData?.supervisor?.designation || "Associate Professor"}, Dept. of CSE
                </p>
              </div>

              <div className="border border-[#e2e2df] rounded p-3">
                <span className="text-[11px] font-bold text-[#666] uppercase block">Institutional Authority</span>
                <p className="font-bold text-[14px] text-[#171717] mt-0.5">Head of Department (HOD)</p>
                <p className="text-[12px] text-[#666]">Departmental Doctoral Programme Committee (DDPC)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ApplicationShell>
  );
}
