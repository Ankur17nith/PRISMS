"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApplicationShell } from "@/components/ApplicationShell";
import { ThesisBookReader } from "@/components/ThesisBookReader";
import { useAuth } from "@/lib/auth";
import { api, SubmissionItem } from "@/lib/api";

export default function FacultyHodReviewWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { activeRole } = useAuth();

  const [submission, setSubmission] = useState<SubmissionItem | null>(null);
  const [eligibleRecipients, setEligibleRecipients] = useState<
    Array<{ userId: string; fullName: string; roleCode: string; designation?: string }>
  >([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [remarks, setRemarks] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [privateNoteSaved, setPrivateNoteSaved] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [sub, recipientsData] = await Promise.all([
          api.getSubmissionDetails(id),
          api.getEligibleRecipients(id, "HOD").catch(() => ({ eligibleRecipients: [] })),
        ]);
        setSubmission(sub);
        setEligibleRecipients(recipientsData.eligibleRecipients || []);
        // By default select all eligible recipients (SDPC + Dean Academics for parallel review if available)
        if (recipientsData.eligibleRecipients && recipientsData.eligibleRecipients.length > 0) {
          setSelectedRecipientIds(recipientsData.eligibleRecipients.map((r) => r.userId));
        }
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const toggleRecipient = (userId: string) => {
    setSelectedRecipientIds((prev) =>
      prev.includes(userId) ? prev.filter((u) => u !== userId) : [...prev, userId]
    );
  };

  const handleForward = async () => {
    if (eligibleRecipients.length > 0 && selectedRecipientIds.length === 0) {
      setError("Please select at least one recipient (SDPC or Dean Academics) to forward to.");
      return;
    }

    setError(null);
    setActionLoading(true);
    try {
      await api.forwardSubmission(id, {
        role: "HOD",
        decision: "APPROVE",
        remarks: remarks.trim() || undefined,
        recipientUserIds: selectedRecipientIds,
      });
      setSuccessMsg("Submission successfully forwarded to institutional authorities.");
      setTimeout(() => router.push("/faculty/queue"), 1500);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!remarks.trim()) {
      setError("Remarks are required when returning for revision.");
      return;
    }

    setError(null);
    setActionLoading(true);
    try {
      await api.returnSubmission(id, {
        role: "HOD",
        remarks: remarks.trim(),
      });
      setSuccessMsg("Submission successfully returned to scholar for revision.");
      setTimeout(() => router.push("/faculty/queue"), 1500);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!remarks.trim()) {
      setError("Remarks are required when rejecting.");
      return;
    }

    if (!confirm("Are you sure you want to reject this submission?")) {
      return;
    }

    setError(null);
    setActionLoading(true);
    try {
      await api.rejectSubmission(id, {
        role: "HOD",
        remarks: remarks.trim(),
      });
      setSuccessMsg("Submission formally rejected.");
      setTimeout(() => router.push("/faculty/queue"), 1500);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / HOD View Only">
        <div className="p-8 text-center text-[#666]">Loading HOD View Only workspace...</div>
      </ApplicationShell>
    );
  }

  if (error && !submission) {
    return (
      <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / HOD View Only">
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
    <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / HOD View Only">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Navigation & Header matching Figma 113:2917 */}
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
                Acting Role: HOD
              </span>
              <span className="text-[11.5px] font-bold px-2 py-0.5 rounded bg-[#fff7e6] text-[#8a570d]">
                View Only · No Document Export
              </span>
            </div>
            <h1 className="text-[24px] font-bold text-[#171717] mt-1">{submission?.title}</h1>
            <p className="text-[13px] text-[#666]">
              Scholar: <span className="font-bold text-[#171717]">{submission?.student.user.fullName}</span> (
              {submission?.student.rollNumber}) · Dept. of {submission?.student.department.name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[13px] font-bold text-[#171717]">
              {submission?.submissionReference} (v{submission?.currentVersion})
            </span>
            <span className="text-[12px] font-bold px-3 py-1 rounded-[4px] bg-[#fff7e6] text-[#8a570d]">
              Under HOD Review
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

        {/* 2-Column Review Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: STRICT VIEW-ONLY Document Viewer (NO DOWNLOAD BUTTON) matching Figma 113:3019 */}
          <div className="lg:col-span-7 space-y-6">
            {submission && (
              <ThesisBookReader
                submissionId={submission.id}
                fileId={latestFile?.id}
                filename={latestFile?.originalFileName || "thesis_document.pdf"}
                canDownload={false}
                userRole="HOD"
              />
            )}

            {/* Informational Policy Banner matching Figma 113:3044 */}
            <div className="p-3 bg-[#f2f2f0] rounded text-[12px] text-[#525252] border border-[#e2e2df]">
              <span className="font-bold text-[#171717] block mb-0.5">Institutional Access Control:</span>
              This HOD assignment permits reviewing the thesis document within this portal workspace only.
              Local downloading, printing, and file export are prohibited by policy and blocked by the server.
            </div>

            {/* Preserved Versions List */}
            <div className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm space-y-2">
              <h3 className="font-bold text-[14.5px] text-[#171717]">Version History · Preserved Records</h3>
              <p className="text-[12.5px] text-[#666]">
                v{submission?.currentVersion} · Current · {latestFile?.originalFileName || "thesis.pdf"} · Under HOD Review
              </p>
            </div>
          </div>

          {/* Right Column: Decision Panel with Parallel Routing to SDPC & Dean Academics */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm space-y-4">
              <div className="border-b border-[#f2f2f0] pb-2">
                <h3 className="font-bold text-[16px] text-[#171717]">HOD Review Decision</h3>
                <p className="text-[12px] text-[#666]">
                  Forward to Senate Doctoral Programme Committee (SDPC) and/or Dean Academics for further review.
                </p>
              </div>

              {/* Parallel Routing Selection */}
              {eligibleRecipients.length > 0 && (
                <div>
                  <label className="block text-[12.5px] font-bold text-[#171717] mb-1.5">
                    Select Target Recipient(s) for Further Institutional Review:
                  </label>
                  <div className="space-y-2 border border-[#e2e2df] rounded-[6px] p-3 bg-[#f7f7f6]">
                    {eligibleRecipients.map((rec) => {
                      const isSelected = selectedRecipientIds.includes(rec.userId);
                      return (
                        <label
                          key={rec.userId}
                          className="flex items-center gap-2.5 text-[12.5px] text-[#171717] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRecipient(rec.userId)}
                          />
                          <span className="font-semibold">{rec.fullName}</span>
                          <span className="text-[11px] text-[#666] bg-white px-1.5 py-0.5 rounded border border-[#e2e2df]">
                            {rec.roleCode}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-[#666] mt-1">
                    Parallel routing allows simultaneous evaluation by SDPC and Dean of Academic Affairs.
                  </p>
                </div>
              )}

              {/* Review Remarks */}
              <div>
                <label className="block text-[12.5px] font-bold text-[#171717] mb-1">
                  HOD Recommendations / Remarks
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter institutional recommendations or required revisions..."
                  className="w-full bg-[#f7f7f6] border border-[#e2e2df] rounded-[6px] px-3 py-2 text-[13px] text-[#171717] focus:outline-none focus:border-[#daa32f]"
                />
              </div>

              {/* Action Buttons matching Figma 113:3070 */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleForward}
                  className="w-full bg-[#16a34a] hover:bg-[#15803d] text-white font-bold py-2.5 rounded-[7px] text-[13px] transition disabled:opacity-60 cursor-pointer shadow-sm"
                >
                  {actionLoading ? "Processing..." : "Forward to Further Institutional Review"}
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleReturn}
                  className="w-full bg-white hover:bg-[#fff7e6] border border-[#daa32f] text-[#8a570d] font-bold py-2 rounded-[7px] text-[13px] transition disabled:opacity-60 cursor-pointer"
                >
                  Request Revision
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleReject}
                  className="w-full bg-white hover:bg-[#fff1ef] border border-[#b42318] text-[#b42318] font-bold py-2 rounded-[7px] text-[13px] transition disabled:opacity-60 cursor-pointer"
                >
                  Reject
                </button>
              </div>
            </div>

            {/* Internal Faculty Notes panel matching Figma 113:3077 */}
            <div className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-[14.5px] text-[#171717]">Internal Departmental Notes</h3>
              <p className="text-[12px] text-[#666]">
                Private faculty note · Never released to the student.
              </p>
              <textarea
                rows={3}
                value={privateNote}
                onChange={(e) => {
                  setPrivateNote(e.target.value);
                  setPrivateNoteSaved(false);
                }}
                placeholder="Enter confidential evaluation notes..."
                className="w-full bg-[#f7f7f6] border border-[#e2e2df] rounded-[6px] px-3 py-2 text-[13px] text-[#171717] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setPrivateNoteSaved(true)}
                className="bg-[#f2f2f0] hover:bg-[#e2e2df] text-[#171717] font-bold text-[12px] px-3.5 py-1.5 rounded transition"
              >
                {privateNoteSaved ? "✓ Note Saved" : "Save Private Note"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ApplicationShell>
  );
}
