"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ApplicationShell } from "@/components/ApplicationShell";
import { ThesisBookReader } from "@/components/ThesisBookReader";
import { api, SubmissionItem } from "@/lib/api";
import { formatDateTime, formatStatusLabel, getStatusBadgeClasses } from "@/lib/statusHelper";

function SubmissionDetailsContent() {
  const searchParams = useSearchParams();
  const idFromQuery = searchParams.get("id");
  const [submission, setSubmission] = useState<SubmissionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        let sub: SubmissionItem;
        const isValidUuid =
          Boolean(idFromQuery) &&
          idFromQuery !== "undefined" &&
          idFromQuery !== "null" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idFromQuery!);

        if (isValidUuid) {
          sub = await api.getSubmissionDetails(idFromQuery!);
        } else {
          const list = await api.getMySubmissions();
          if (list && list.length > 0) {
            sub = await api.getSubmissionDetails(list[0].id);
          } else {
            setError("No thesis submissions found for your doctoral account.");
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
    load();
  }, [idFromQuery]);

  if (loading) {
    return (
      <ApplicationShell portalType="student" breadcrumb="Student portal / Submission Details">
        <div className="p-8 text-center text-[#666]">Loading submission details...</div>
      </ApplicationShell>
    );
  }

  if (error || !submission) {
    return (
      <ApplicationShell portalType="student" breadcrumb="Student portal / Submission Details">
        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 text-center">
          <p className="text-[14px] text-[#b42318] font-bold mb-2">{error || "Submission not found"}</p>
          <Link
            href="/student/dashboard"
            className="text-[13px] text-[#166534] hover:underline font-bold"
          >
            ← Return to Dashboard
          </Link>
        </div>
      </ApplicationShell>
    );
  }

  const latestFile = submission.files && submission.files.length > 0 ? submission.files[0] : null;

  return (
    <ApplicationShell portalType="student" breadcrumb="Student portal / Submission Details">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Title strip */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold text-[#171717]">{submission.title || "Doctoral Thesis"}</h1>
            <p className="text-[13px] text-[#666]">
              Reference: <span className="font-bold text-[#171717]">{submission.submissionReference}</span> ·
              Version <span className="font-bold text-[#171717]">{submission.currentVersion}</span>
              {submission.submittedAt && (
                <> · Submitted: <span className="font-semibold text-[#171717]">{formatDateTime(submission.submittedAt)}</span></>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-[12px] font-bold px-3 py-1.5 rounded-[4px] ${getStatusBadgeClasses(submission.status)}`}
            >
              {formatStatusLabel(submission.status)}
            </span>

            <Link
              href={`/student/thesis/reader?id=${submission.id}`}
              className="bg-[#171717] hover:bg-[#333] text-white text-[12px] font-bold px-3 py-1.5 rounded-[6px] transition flex items-center gap-1.5 shadow-sm"
            >
              <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Open in Dedicated Reader</span>
            </Link>

            {submission.status === "REVISION_REQUIRED" && (
              <Link
                href={`/student/thesis/submit?resubmit=${submission.id}`}
                className="bg-[#daa32f] hover:bg-[#c49228] text-white font-bold text-[13px] px-4 py-1.5 rounded-[6px]"
              >
                Submit Revision (v{(submission.currentVersion || 1) + 1}) →
              </Link>
            )}
          </div>
        </div>

        {/* Revision alert if required (matching Figma 89:2021) */}
        {submission.status === "REVISION_REQUIRED" && (
          <div className="bg-[#fff7e6] border border-[#daa32f] rounded-[8px] p-5 text-[13px] text-[#8a570d] space-y-2">
            <h3 className="text-[15px] font-bold text-[#8a570d]">
              Review Decision: Revision Required Before Institutional Approval
            </h3>
            <p>
              The committee has requested modifications to your dissertation. Please review the reviewer comments below,
              update your document, and submit Version {(submission.currentVersion || 1) + 1}. Previous versions are retained
              in accordance with institutional policy.
            </p>
          </div>
        )}

        {/* 2-column layout: Left = Stage timeline & remarks, Right = Embedded PDF viewer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Timeline & Released Feedback */}
          <div className="lg:col-span-5 min-w-0 space-y-6">
            {/* Timeline */}
            <div className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-[15px] text-[#171717] border-b border-[#f2f2f0] pb-2">
                Approval Workflow Stages
              </h3>
              <div className="space-y-4 text-[12.5px]">
                {submission.stages && submission.stages.length > 0 ? (
                  submission.stages.map((st, idx) => (
                    <div key={st.id || `stg-${idx}`} className="flex items-start gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                          st.status === "COMPLETED"
                            ? "bg-[#16a34a] text-white"
                            : st.status === "PENDING"
                            ? "bg-[#daa32f] text-white"
                            : "bg-[#e2e2df] text-[#666]"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[#171717] leading-tight">
                          {st.stageDefinition?.name || st.stageDefinition?.code}
                        </p>
                        <p className="text-[11px] text-[#666]">
                          Status:{" "}
                          <span className={st.status === "COMPLETED" ? "text-[#166534] font-semibold" : ""}>
                            {st.status}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[#666]">Supervisor Review (Active)</p>
                )}
              </div>
            </div>

            {/* Released Feedback and Remarks */}
            <div className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-[15px] text-[#171717] border-b border-[#f2f2f0] pb-2">
                Released Reviewer Feedback
              </h3>
              {submission.decisions && submission.decisions.length > 0 ? (
                <div className="space-y-3">
                  {submission.decisions.map((dec) => (
                    <div key={dec.id} className="p-3 bg-[#f7f7f6] rounded border border-[#e2e2df] text-[12.5px]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[#171717]">{dec.reviewer.fullName}</span>
                        <span className="text-[10.5px] text-[#666]">
                          {formatDateTime(dec.createdAt)}
                        </span>
                      </div>
                      <p className="text-[#303030] whitespace-pre-wrap">{dec.remarks || "No written remarks recorded."}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12.5px] text-[#666]">
                  No formal review remarks have been released to the scholar portal yet.
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Secure Document Viewer */}
          <div className="lg:col-span-7 min-w-0 space-y-4">
            {submission && (
              <ThesisBookReader
                submissionId={submission.id}
                fileId={latestFile?.id}
                filename={latestFile?.originalFileName || "thesis_document.pdf"}
                canDownload={true}
                userRole="STUDENT"
              />
            )}
          </div>
        </div>
      </div>
    </ApplicationShell>
  );
}

export default function StudentSubmissionDetailsPage() {
  return (
    <Suspense
      fallback={
        <ApplicationShell portalType="student" breadcrumb="Student portal / Submission Details">
          <div className="p-8 text-center text-[#666]">Loading submission details...</div>
        </ApplicationShell>
      }
    >
      <SubmissionDetailsContent />
    </Suspense>
  );
}
