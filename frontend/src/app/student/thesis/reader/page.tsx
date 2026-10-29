"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ApplicationShell } from "@/components/ApplicationShell";
import { ThesisBookReader } from "@/components/ThesisBookReader";
import { api, SubmissionItem } from "@/lib/api";
import { formatStatusLabel, getStatusBadgeClasses } from "@/lib/statusHelper";

function StudentThesisReaderContent() {
  const searchParams = useSearchParams();
  const idFromQuery = searchParams.get("id");
  const fileIdFromQuery = searchParams.get("fileId");

  const [submission, setSubmission] = useState<SubmissionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        let sub: SubmissionItem;
        if (idFromQuery && idFromQuery !== "undefined") {
          sub = await api.getSubmissionDetails(idFromQuery);
        } else {
          const list = await api.getMySubmissions();
          if (list && list.length > 0) {
            sub = await api.getSubmissionDetails(list[0].id);
          } else {
            setError("No active thesis submissions found in your account.");
            return;
          }
        }
        setSubmission(sub);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [idFromQuery]);

  if (loading) {
    return (
      <ApplicationShell portalType="student" breadcrumb="Student portal / In-Portal Thesis Reader">
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <div className="w-8 h-8 border-2 border-[#daa32f] border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] text-[#666] font-medium">Loading thesis document reader...</p>
        </div>
      </ApplicationShell>
    );
  }

  if (error || !submission) {
    return (
      <ApplicationShell portalType="student" breadcrumb="Student portal / In-Portal Thesis Reader">
        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-8 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#f2f2f0] text-[#666] flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-[18px] font-bold text-[#171717]">Document Unavailable</h2>
          <p className="text-[13px] text-[#b42318]">{error || "Thesis submission could not be located."}</p>
          <div className="pt-2">
            <Link
              href="/student/dashboard"
              className="bg-[#166534] hover:bg-[#14532d] text-white font-bold text-[13px] px-4 py-2 rounded transition inline-block"
            >
              ← Return to Dashboard
            </Link>
          </div>
        </div>
      </ApplicationShell>
    );
  }

  const latestFile =
    fileIdFromQuery && submission.files
      ? submission.files.find((f) => f.id === fileIdFromQuery) || submission.files[0]
      : submission.files && submission.files.length > 0
      ? submission.files[0]
      : null;

  return (
    <ApplicationShell portalType="student" breadcrumb="Student portal / In-Portal Thesis Reader">
      <div className="space-y-4 max-w-6xl mx-auto">
        {/* Top Header Bar */}
        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href={`/student/thesis/details?id=${submission.id}`}
                className="text-[12px] text-[#166534] hover:underline font-semibold"
              >
                ← Back to Submission Details
              </Link>
              <span className="text-[#ccc]">·</span>
              <span className="text-[12px] text-[#666]">Dedicated In-Portal Reader</span>
            </div>
            <h1 className="text-[20px] font-bold text-[#171717] leading-tight">
              {submission.title || "PhD Dissertation"}
            </h1>
            <p className="text-[12px] text-[#666] mt-0.5">
              Reference: <span className="font-bold text-[#171717]">{submission.submissionReference}</span> ·
              Version <span className="font-bold text-[#171717]">{submission.currentVersion}</span>
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

        {/* Dedicated Reader Workspace */}
        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-4 shadow-sm">
          <ThesisBookReader
            submissionId={submission.id}
            fileId={latestFile?.id}
            filename={latestFile?.originalFileName || "thesis_document.pdf"}
            canDownload={true}
            userRole="STUDENT"
          />
        </div>
      </div>
    </ApplicationShell>
  );
}

export default function StudentThesisReaderPage() {
  return (
    <Suspense
      fallback={
        <ApplicationShell portalType="student" breadcrumb="Student portal / In-Portal Thesis Reader">
          <div className="p-8 text-center text-[#666]">Loading reader workspace...</div>
        </ApplicationShell>
      }
    >
      <StudentThesisReaderContent />
    </Suspense>
  );
}
