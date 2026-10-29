"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { ApplicationShell } from "@/components/ApplicationShell";
import { ThesisBookReader } from "@/components/ThesisBookReader";
import { useAuth } from "@/lib/auth";
import { api, SubmissionItem } from "@/lib/api";
import { formatStatusLabel, getStatusBadgeClasses } from "@/lib/statusHelper";

export default function FacultyThesisReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { activeRole } = useAuth();

  const [submission, setSubmission] = useState<SubmissionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isHod = activeRole === "HOD";
  const canDownload = !isHod;

  useEffect(() => {
    async function loadData() {
      if (!id || id === "undefined") {
        setError("Invalid thesis submission identifier provided.");
        setLoading(false);
        return;
      }
      try {
        const sub = await api.getSubmissionDetails(id);
        setSubmission(sub);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / Thesis Document Reader">
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <div className="w-8 h-8 border-2 border-[#daa32f] border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] text-[#666] font-medium">Opening secure dissertation reader...</p>
        </div>
      </ApplicationShell>
    );
  }

  if (error || !submission) {
    return (
      <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / Thesis Document Reader">
        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-8 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#fef2f2] flex items-center justify-center text-[#dc2626]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-[18px] font-bold text-[#171717]">Document Access Restricted</h2>
          <p className="text-[13px] text-[#b42318]">{error || "Dissertation record could not be loaded."}</p>
          <div className="pt-2">
            <Link
              href="/faculty/queue"
              className="bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-[13px] px-4 py-2 rounded transition inline-block"
            >
              ← Return to Evaluation Queue
            </Link>
          </div>
        </div>
      </ApplicationShell>
    );
  }

  const latestFile =
    submission.files && submission.files.length > 0 ? submission.files[0] : null;

  const scholarFullName =
    submission.student?.user?.fullName ||
    (submission as any).scholar?.fullName ||
    (submission as any).scholar?.user?.fullName ||
    "Doctoral Scholar";

  const scholarRoll =
    submission.student?.rollNumber ||
    (submission as any).scholar?.rollNumber ||
    "N/A";

  const deptName =
    submission.student?.department?.name ||
    (submission as any).scholar?.department?.name ||
    "Computer Science and Engineering";

  return (
    <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / Thesis Document Reader">
      <div className="space-y-4 max-w-6xl mx-auto">
        {/* Top Header Card */}
        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href={isHod ? `/faculty/reviews/${id}/hod` : `/faculty/reviews/${id}`}
                className="text-[12px] text-[#16a34a] hover:underline font-semibold"
              >
                ← Back to Review Workspace
              </Link>
              <span className="text-[#ccc]">·</span>
              <span className="text-[12px] text-[#666]">
                Role: <span className="font-bold text-[#171717]">{activeRole || "SUPERVISOR"}</span>
              </span>
            </div>
            <h1 className="text-[20px] font-bold text-[#171717] leading-tight">
              {submission.title || "PhD Dissertation"}
            </h1>
            <p className="text-[12.5px] text-[#666] mt-0.5">
              Scholar: <span className="font-bold text-[#171717]">{scholarFullName}</span> ({scholarRoll}) · Dept. of {deptName} ·
              Ref: <span className="font-mono font-bold text-[#171717]">{submission.submissionReference}</span> (v{submission.currentVersion})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-[12px] font-bold px-3 py-1 rounded-[4px] ${getStatusBadgeClasses(submission.status)}`}
            >
              {formatStatusLabel(submission.status)}
            </span>
          </div>
        </div>

        {/* Mandatory Statutory HOD Download Restriction Notice */}
        {isHod && (
          <div className="bg-[#fff7e6] border border-[#daa32f] rounded-[8px] p-3.5 flex items-start gap-3 text-[12.5px] text-[#8a570d] shadow-sm">
            <svg className="w-5 h-5 shrink-0 text-[#8a570d] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <span className="font-bold block">NIT Hamirpur Institutional Compliance Notice (HOD Evaluation Mode):</span>
              In accordance with institutional ordinances, Head of Department review access is strictly confined to secure
              in-portal reading. File downloading, local archiving, and external distribution are prohibited by policy and
              prevented at the server level.
            </div>
          </div>
        )}

        {/* Dedicated Reader Surface */}
        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-4 shadow-sm">
          <ThesisBookReader
            submissionId={submission.id}
            fileId={latestFile?.id}
            filename={latestFile?.originalFileName || "thesis_document.pdf"}
            canDownload={canDownload}
            userRole={activeRole}
          />
        </div>
      </div>
    </ApplicationShell>
  );
}
