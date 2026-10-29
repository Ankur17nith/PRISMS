"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApplicationShell } from "@/components/ApplicationShell";
import { useAuth } from "@/lib/auth";
import { api, SubmissionItem } from "@/lib/api";
import { formatStatusLabel, getStatusBadgeClasses } from "@/lib/statusHelper";
import { ThesisBookReader } from "@/components/ThesisBookReader";

export default function FacultyReviewWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, activeRole } = useAuth();

  const [submission, setSubmission] = useState<SubmissionItem | null>(null);
  const [eligibleRecipients, setEligibleRecipients] = useState<
    Array<{ userId: string; fullName: string; roleCode: string; designation?: string }>
  >([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");
  const [remarks, setRemarks] = useState("");
  const [isActionable, setIsActionable] = useState(false);
  const [currentPendingStage, setCurrentPendingStage] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id || id === "undefined") {
        setError("Invalid thesis submission identifier provided.");
        setLoading(false);
        return;
      }
      try {
        const [sub, recipientsData] = await Promise.all([
          api.getSubmissionDetails(id),
          api.getEligibleRecipients(id, activeRole || undefined).catch(() => ({
            isActionable: false,
            currentStage: "",
            eligibleRecipients: [],
          })),
        ]);
        setSubmission(sub);
        setEligibleRecipients(recipientsData.eligibleRecipients || []);
        if (recipientsData.eligibleRecipients && recipientsData.eligibleRecipients.length > 0) {
          setSelectedRecipientId(recipientsData.eligibleRecipients[0].userId);
        }

        const stagesList = (sub as any).stages || [];
        const pendingStage = stagesList.find((s: any) => s.status === "PENDING");
        setCurrentPendingStage(pendingStage || null);

        const hasPendingAssignment = pendingStage?.assignments?.some((a: any) => {
          const rId = a.reviewerId || a.reviewerUserId || a.reviewer?.id;
          const isUser = rId === user?.id;
          const isPending = a.status === "ASSIGNED" || a.status === "ACCEPTED";
          return isUser && isPending;
        });

        const canAct = Boolean(
          (sub.status === "SUBMITTED" || sub.status === "IN_REVIEW") &&
          hasPendingAssignment &&
          recipientsData.isActionable !== false
        );
        setIsActionable(canAct);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, activeRole, user?.id]);

  // Handle Forward / Approve
  const handleForward = async () => {
    if (eligibleRecipients.length > 0 && !selectedRecipientId) {
      setError("Please select a verified institutional recipient to forward to.");
      return;
    }

    setError(null);
    setActionLoading(true);
    try {
      await api.forwardSubmission(id, {
        role: activeRole || undefined,
        decision: "APPROVE",
        remarks: remarks.trim() || undefined,
        recipientUserIds: selectedRecipientId ? [selectedRecipientId] : [],
      });
      setSuccessMsg("Submission successfully forwarded to the next workflow stage.");
      setTimeout(() => router.push("/faculty/queue"), 1500);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Return for Revision
  const handleReturn = async () => {
    if (!remarks.trim()) {
      setError("Mandatory remarks are required when returning a submission for revision.");
      return;
    }

    setError(null);
    setActionLoading(true);
    try {
      await api.returnSubmission(id, {
        role: activeRole || undefined,
        remarks: remarks.trim(),
      });
      setSuccessMsg("Submission successfully returned to the scholar for revision.");
      setTimeout(() => router.push("/faculty/queue"), 1500);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject
  const handleReject = async () => {
    if (!remarks.trim()) {
      setError("Mandatory remarks are required when formally rejecting a submission.");
      return;
    }

    if (!confirm("Are you sure you want to formally reject this doctoral thesis submission?")) {
      return;
    }

    setError(null);
    setActionLoading(true);
    try {
      await api.rejectSubmission(id, {
        role: activeRole || undefined,
        remarks: remarks.trim(),
      });
      setSuccessMsg("Submission has been formally rejected.");
      setTimeout(() => router.push("/faculty/queue"), 1500);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / Review Workspace">
        <div className="p-8 text-center text-[#666]">Loading review workspace...</div>
      </ApplicationShell>
    );
  }

  if (error && !submission) {
    return (
      <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / Review Workspace">
        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 text-center">
          <p className="text-[14px] text-[#b42318] font-bold mb-2">{error}</p>
          <Link href="/faculty/queue" className="text-[13px] text-[#16a34a] hover:underline font-bold">
            ← Return to Approval Queue
          </Link>
        </div>
      </ApplicationShell>
    );
  }

  const latestFile = submission?.files && submission.files.length > 0 ? submission.files[0] : null;

  return (
    <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / Review Workspace">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Navigation & Status Header matching Figma 113:2713 */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e2e2df] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/faculty/queue"
                className="text-[12px] text-[#666] hover:text-[#171717] font-semibold"
              >
                ← Back to Queue
              </Link>
              <span className="text-[#a3a3a3]">·</span>
              <span className="text-[11.5px] font-bold px-2 py-0.5 rounded bg-[#f2f2f0] text-[#303030]">
                Acting Role: {activeRole || "SUPERVISOR"}
              </span>
            </div>
            <h1 className="text-[24px] font-bold text-[#171717] mt-1">
              {submission?.title || "PhD Thesis Submission"}
            </h1>
            <p className="text-[13px] text-[#666]">
              Scholar:{" "}
              <span className="font-bold text-[#171717]">
                {submission?.student?.user?.fullName ||
                  (submission as any)?.scholar?.fullName ||
                  (submission as any)?.scholar?.user?.fullName ||
                  "Doctoral Scholar"}
              </span>{" "}
              ({submission?.student?.rollNumber || (submission as any)?.scholar?.rollNumber || "N/A"}) · Dept. of{" "}
              {submission?.student?.department?.name ||
                (submission as any)?.scholar?.department?.name ||
                "Computer Science and Engineering"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/faculty/thesis/reader/${id}`}
              className="bg-[#171717] hover:bg-[#333] text-white text-[12px] font-bold px-3 py-1.5 rounded transition flex items-center gap-1.5 shadow-sm"
            >
              <span>📖</span>
              <span>Open in Reader</span>
            </Link>
            <span className="font-mono text-[13px] font-bold text-[#171717]">
              {submission?.submissionReference || "TH-2026-001"} (v{submission?.currentVersion || 1})
            </span>
            <span
              className={`text-[12px] font-bold px-3 py-1 rounded-[4px] ${getStatusBadgeClasses(submission?.status)}`}
            >
              {formatStatusLabel(submission?.status)}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-[#fff1ef] border border-[#b42318] text-[#b42318] text-[13px] rounded-[6px]">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-[#edf8ef] border border-[#16a34a] text-[#166534] text-[13px] rounded-[6px] font-bold">
            {successMsg}
          </div>
        )}

        {/* 2-Column Review Layout matching Figma 113:2713 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Thesis Document Book Reader */}
          <div className="lg:col-span-7 space-y-6">
            {submission && (
              <ThesisBookReader
                submissionId={submission.id}
                fileId={latestFile?.id}
                filename={latestFile?.originalFileName || "thesis_document.pdf"}
                canDownload={activeRole !== "HOD"}
                userRole={activeRole}
              />
            )}

            {/* Version History info panel */}
            <div className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm">
              <h3 className="font-bold text-[14.5px] text-[#171717] mb-2">Version History & Retained Records</h3>
              <p className="text-[12.5px] text-[#666] mb-3">
                All previous versions are permanently preserved. Current canonical version: v{submission?.currentVersion}.
              </p>
              <div className="divide-y divide-[#f2f2f0] text-[12.5px]">
                <div className="py-2 flex justify-between">
                  <span className="font-bold text-[#171717]">Version {submission?.currentVersion} (Current)</span>
                  <span className="text-[#166534] font-semibold">{submission?.status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Decision Form OR Institutional Tracking View */}
          <div className="lg:col-span-5 space-y-6">
            {isActionable ? (
              <div className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm space-y-4">
                <div className="border-b border-[#f2f2f0] pb-2">
                  <h3 className="font-bold text-[16px] text-[#171717]">Review Decision & Actions</h3>
                  <p className="text-[12px] text-[#666]">
                    Select decision and authorized recipient path according to institutional ordinances.
                  </p>
                </div>

                {/* Dynamic Recipient Routing (only for forwarding) */}
                {eligibleRecipients.length > 0 && (
                  <div>
                    <label className="block text-[12.5px] font-bold text-[#171717] mb-1">
                      Route to Recipient (Next Authority) *
                    </label>
                    <select
                      value={selectedRecipientId}
                      onChange={(e) => setSelectedRecipientId(e.target.value)}
                      className="w-full bg-[#f7f7f6] border border-[#e2e2df] rounded-[6px] px-3 py-2 text-[13px] text-[#171717] focus:outline-none focus:border-[#daa32f]"
                    >
                      {eligibleRecipients.map((rec) => (
                        <option key={rec.userId} value={rec.userId}>
                          {rec.fullName} — {rec.roleCode} {rec.designation ? `(${rec.designation})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Remarks / Comments */}
                <div>
                  <label className="block text-[12.5px] font-bold text-[#171717] mb-1">
                    Review Remarks & Feedback *
                  </label>
                  <textarea
                    rows={4}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter remarks for forward, or required revisions for return/rejection..."
                    className="w-full bg-[#f7f7f6] border border-[#e2e2df] rounded-[6px] px-3 py-2 text-[13px] text-[#171717] focus:outline-none focus:border-[#daa32f]"
                  />
                  <p className="text-[11px] text-[#666] mt-1">
                    Remarks are mandatory when returning for revision or rejecting.
                  </p>
                </div>

                {/* Decision Action Buttons matching Figma */}
                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleForward}
                    className="w-full bg-[#16a34a] hover:bg-[#15803d] text-white font-bold py-2.5 rounded-[7px] text-[13px] transition disabled:opacity-60 cursor-pointer shadow-sm"
                  >
                    {actionLoading ? "Processing..." : "Approve & Forward to Next Authority"}
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleReturn}
                    className="w-full bg-white hover:bg-[#fff7e6] border border-[#daa32f] text-[#8a570d] font-bold py-2 rounded-[7px] text-[13px] transition disabled:opacity-60 cursor-pointer"
                  >
                    Return to Scholar for Revision
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleReject}
                    className="w-full bg-white hover:bg-[#fff1ef] border border-[#b42318] text-[#b42318] font-bold py-2 rounded-[7px] text-[13px] transition disabled:opacity-60 cursor-pointer"
                  >
                    Formal Rejection
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm space-y-4">
                <div className="border-b border-[#f2f2f0] pb-2">
                  <h3 className="font-bold text-[16px] text-[#171717]">Workflow Status & Authority Tracking</h3>
                  <p className="text-[12px] text-[#666]">
                    Submission record is displayed in institutional tracking mode.
                  </p>
                </div>

                <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-[6px] p-4 text-[12.5px] text-[#0369a1] space-y-2">
                  <div className="flex items-center gap-2 font-bold text-[#0c4a6e]">
                    <span>📋</span>
                    <span>Current Stage: {currentPendingStage?.stageName || currentPendingStage?.definition?.name || currentPendingStage?.stageCode || (submission?.status === "APPROVED" ? "Approved" : "Under Evaluation")}</span>
                  </div>
                  <p className="leading-relaxed text-[#0284c7]">
                    {submission?.status === "APPROVED"
                      ? "This dissertation submission has completed all institutional review stages and received final Senate approval."
                      : submission?.status === "REJECTED"
                      ? "This dissertation submission was formally rejected in institutional review."
                      : "Your evaluation has been completed and forwarded. This submission is currently undergoing evaluation by subsequent authorities."}
                  </p>
                  {currentPendingStage?.assignments && currentPendingStage.assignments.length > 0 && (
                    <div className="pt-2 border-t border-[#bae6fd]/60 text-[11.5px]">
                      <span className="font-bold text-[#0c4a6e]">Designated Reviewer: </span>
                      <span>{currentPendingStage.assignments.map((a: any) => a.reviewerName || a.reviewer?.fullName || a.reviewerRole).join(", ")}</span>
                    </div>
                  )}
                </div>

                {/* Prior Comments & Recorded Reviewer Decisions */}
                {submission?.decisions && submission.decisions.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <h4 className="text-[12px] font-bold text-[#171717]">Recorded Review Decisions:</h4>
                    {submission.decisions.map((dec) => (
                      <div key={dec.id} className="p-3 bg-[#fafaf9] rounded border border-[#e2e2df] text-[12px]">
                        <div className="flex justify-between font-bold text-[#171717] mb-0.5">
                          <span>{dec.reviewer?.fullName || "Reviewer"}</span>
                          <span className={dec.decision === "APPROVE" ? "text-[#166534]" : "text-[#b42318]"}>
                            {dec.decision}
                          </span>
                        </div>
                        {dec.remarks && <p className="text-[#666] text-[11.5px] mt-1 italic">"{dec.remarks}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Workflow Stage Timeline */}
            <div className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-[14.5px] text-[#171717] border-b border-[#f2f2f0] pb-2">
                Workflow Progress
              </h3>
              <div className="space-y-3 text-[12px]">
                {submission?.stages?.map((st, i) => (
                  <div key={st.id} className="flex items-center justify-between">
                    <span className="font-medium text-[#171717]">
                      {i + 1}. {st.stageDefinition?.name || (st as any).stageName || st.stageDefinition?.code || (st as any).stageCode}
                    </span>
                    <span
                      className={`font-bold text-[11px] px-2 py-0.5 rounded ${
                        st.status === "COMPLETED"
                          ? "bg-[#edf8ef] text-[#166534]"
                          : st.status === "PENDING"
                          ? "bg-[#fff7e6] text-[#8a570d]"
                          : "bg-[#f2f2f0] text-[#666]"
                      }`}
                    >
                      {st.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ApplicationShell>
  );
}
