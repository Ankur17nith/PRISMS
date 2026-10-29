"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ApplicationShell } from "@/components/ApplicationShell";
import { useAuth } from "@/lib/auth";
import { api, SubmissionItem } from "@/lib/api";

function ThesisSubmitContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resubmitSubmissionId = searchParams.get("resubmit");

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [title, setTitle] = useState("");
  const [abstractText, setAbstractText] = useState("");
  const [keywords, setKeywords] = useState("Distributed Systems, Fault Tolerance, Consensus");
  const [fileScanId, setFileScanId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [sha256, setSha256] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [declared, setDeclared] = useState(false);
  const [supervisor, setSupervisor] = useState<{ fullName: string; designation: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<SubmissionItem | null>(null);
  const [, startTransition] = useTransition();

  // Load draft data
  useEffect(() => {
    async function loadDraft() {
      try {
        const data = await api.getDraft();
        if (data.supervisor) {
          setSupervisor(data.supervisor);
        }
        if (data.draft) {
          setTitle(data.draft.title || "");
          setAbstractText(data.draft.abstract || "");
          if (data.draft.keywords && data.draft.keywords.length > 0) {
            setKeywords(data.draft.keywords.join(", "));
          }
          if (data.draft.fileScanId) {
            setFileScanId(data.draft.fileScanId);
            setFileName(data.draft.originalFileName || "thesis_draft.pdf");
            setFileSize(data.draft.fileSizeBytes || null);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        }
      }
    }
    loadDraft();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only authentic PDF documents (.pdf) are permitted.");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const res = await api.uploadThesisPdf(file);
      setFileScanId(res.fileScanId);
      setFileName(res.originalFileName);
      setFileSize(res.fileSizeBytes);
      setSha256(res.sha256Checksum);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to upload file");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await api.saveDraft({
        title,
        abstract: abstractText,
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        fileScanId: fileScanId || undefined,
      });
      alert("Draft saved successfully.");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    }
  };

  const handleFinalSubmit = async () => {
    if (!declared) {
      setError("You must confirm the compliance and originality declaration before submitting.");
      return;
    }
    if (!fileScanId) {
      setError("Please upload your final thesis PDF in Step 2 before submitting.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          title,
          abstract: abstractText,
          keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
          fileScanId,
        };

        let result: SubmissionItem;
        if (resubmitSubmissionId) {
          result = await api.resubmitThesis(resubmitSubmissionId, payload);
        } else {
          result = await api.submitThesis(payload);
        }

        setSuccessReceipt(result);
        setStep(4);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Submission failed. Please check requirements and retry.");
        }
      }
    });
  };

  return (
    <ApplicationShell portalType="student" breadcrumb="Student portal / Thesis Submission">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-[26px] font-bold text-[#171717]">
            {resubmitSubmissionId ? "Resubmit Revised Thesis" : "Thesis Submission"}
          </h1>
          <p className="text-[14px] text-[#666]">
            {resubmitSubmissionId
              ? "Prepare and submit your updated thesis version addressing review committee remarks."
              : "Prepare, review, and submit your doctoral thesis for institutional approval."}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-[#fff1ef] border border-[#b42318] text-[#b42318] text-[13px] rounded-[6px]">
            {error}
          </div>
        )}

        {/* 3-Step Wizard Indicator matching Figma 89:706 */}
        {step !== 4 && (
          <div className="bg-white border border-[#e2e2df] rounded-[7px] p-4 flex gap-6 text-[13px] shadow-sm">
            <button
              onClick={() => setStep(1)}
              className={`flex-1 text-left ${step === 1 ? "font-bold text-[#166534]" : "text-[#666]"}`}
            >
              <div className="leading-tight">1. Submission Details</div>
              <div className="text-[11px] text-[#737373]">
                {step === 1 ? "Current step" : "Completed"}
              </div>
            </button>

            <button
              onClick={() => {
                if (!title) {
                  setError("Please complete the title in Step 1 before proceeding.");
                  return;
                }
                setStep(2);
              }}
              className={`flex-1 text-left ${step === 2 ? "font-bold text-[#166534]" : "text-[#666]"}`}
            >
              <div className="leading-tight">2. Documents</div>
              <div className="text-[11px] text-[#737373]">
                {step === 2 ? "Current step" : step > 2 ? "Completed" : "Next"}
              </div>
            </button>

            <button
              onClick={() => {
                if (!title || !fileScanId) {
                  setError("Please complete title and upload PDF before proceeding to final review.");
                  return;
                }
                setStep(3);
              }}
              className={`flex-1 text-left ${step === 3 ? "font-bold text-[#166534]" : "text-[#666]"}`}
            >
              <div className="leading-tight">3. Review & Submit</div>
              <div className="text-[11px] text-[#737373]">
                {step === 3 ? "Current step" : "Next"}
              </div>
            </button>
          </div>
        )}

        {/* STEP 1: Submission Details */}
        {step === 1 && (
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-6">
            <div className="border-b border-[#f2f2f0] pb-3">
              <h2 className="text-[17px] font-bold text-[#171717]">Step 1: Submission Metadata</h2>
              <p className="text-[13px] text-[#666]">
                Review institutional scholar records and provide thesis dissertation details.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#f7f7f6] rounded-[6px] text-[12.5px]">
              <div>
                <span className="text-[#666] block">Scholar Name:</span>
                <span className="font-bold text-[#171717]">{user?.fullName}</span>
              </div>
              <div>
                <span className="text-[#666] block">Roll Number:</span>
                <span className="font-bold text-[#171717]">
                  {user?.studentProfile?.rollNumber || "25PHD001"}
                </span>
              </div>
              <div>
                <span className="text-[#666] block">Department:</span>
                <span className="font-bold text-[#171717]">
                  {user?.studentProfile?.department?.name || "Computer Science and Engineering"}
                </span>
              </div>
              <div>
                <span className="text-[#666] block">Designated Supervisor:</span>
                <span className="font-bold text-[#171717]">
                  {supervisor?.fullName || "Dr. Alok Verma"}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-bold text-[#171717] mb-1">
                  Title of Doctoral Dissertation *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Scalable Consensus Protocols for Heterogeneous Edge Networks"
                  className="w-full bg-[#f7f7f6] border border-[#e2e2df] rounded-[6px] px-3 py-2 text-[13.5px] text-[#171717] focus:outline-none focus:border-[#daa32f]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-[#171717] mb-1">
                  Abstract / Summary of Research *
                </label>
                <textarea
                  rows={5}
                  required
                  value={abstractText}
                  onChange={(e) => setAbstractText(e.target.value)}
                  placeholder="Provide a concise abstract of the doctoral thesis..."
                  className="w-full bg-[#f7f7f6] border border-[#e2e2df] rounded-[6px] px-3 py-2 text-[13.5px] text-[#171717] focus:outline-none focus:border-[#daa32f]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-[#171717] mb-1">
                  Keywords (comma separated)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="Distributed Systems, Consensus, Performance"
                  className="w-full bg-[#f7f7f6] border border-[#e2e2df] rounded-[6px] px-3 py-2 text-[13.5px] text-[#171717] focus:outline-none focus:border-[#daa32f]"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-[#f2f2f0]">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-4 py-2 bg-[#f2f2f0] text-[#303030] rounded-[6px] text-[13px] hover:bg-[#e2e2df] font-medium"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!title.trim()) {
                    setError("Title is required.");
                    return;
                  }
                  setError(null);
                  setStep(2);
                }}
                className="px-5 py-2.5 bg-[#16a34a] text-white rounded-[7px] text-[13px] font-bold hover:bg-[#15803d]"
              >
                Next: Upload Document →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Documents (Upload PDF) matching Figma 89:1835 */}
        {step === 2 && (
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-6">
            <div className="border-b border-[#f2f2f0] pb-3">
              <h2 className="text-[17px] font-bold text-[#171717]">Step 2: Upload Thesis Document</h2>
              <p className="text-[13px] text-[#666]">
                Upload your complete dissertation in PDF format (maximum size 20 MiB).
              </p>
            </div>

            <div className="border-2 border-dashed border-[#e2e2df] hover:border-[#daa32f] rounded-[8px] p-8 text-center transition bg-[#f7f7f6]">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#fbf3de] text-[#daa32f] flex items-center justify-center mx-auto text-[20px] font-bold">
                  📄
                </div>
                <div>
                  <label className="cursor-pointer inline-block bg-[#16a34a] hover:bg-[#15803d] text-white text-[13px] font-bold px-4 py-2 rounded-[6px] shadow-sm">
                    {uploading ? "Processing PDF..." : "Select Thesis PDF"}
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      disabled={uploading}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[12px] text-[#666] mt-2">
                    PDF must start with %PDF- signature and not exceed 20 MiB
                  </p>
                </div>
              </div>
            </div>

            {/* Uploaded File Info Card */}
            {fileScanId && (
              <div className="p-4 bg-[#edf8ef] border border-[#16a34a] rounded-[6px] flex items-center justify-between">
                <div>
                  <p className="font-bold text-[13.5px] text-[#166534]">✓ {fileName}</p>
                  <p className="text-[11.5px] text-[#166534]">
                    Size: {fileSize ? (fileSize / (1024 * 1024)).toFixed(2) + " MB" : "Verified"} · Status: Clean & Scanned
                  </p>
                  {sha256 && (
                    <p className="text-[10.5px] text-[#166534] font-mono mt-0.5 truncate max-w-md">
                      SHA-256: {sha256}
                    </p>
                  )}
                </div>
                <span className="text-[12px] font-bold text-[#166534] bg-white px-2 py-1 rounded border border-[#16a34a]">
                  Ready
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-[#f2f2f0]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-[#f2f2f0] text-[#303030] rounded-[6px] text-[13px] hover:bg-[#e2e2df]"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!fileScanId) {
                    setError("Please upload a valid thesis PDF before proceeding.");
                    return;
                  }
                  setError(null);
                  setStep(3);
                }}
                className="px-5 py-2.5 bg-[#16a34a] text-white rounded-[7px] text-[13px] font-bold hover:bg-[#15803d]"
              >
                Next: Review & Submit →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Submit matching Figma 89:1900 */}
        {step === 3 && (
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-6">
            <div className="border-b border-[#f2f2f0] pb-3">
              <h2 className="text-[17px] font-bold text-[#171717]">Step 3: Verification & Submission</h2>
              <p className="text-[13px] text-[#666]">
                Confirm all thesis information. Once submitted, your submission will enter the Supervisor Review stage.
              </p>
            </div>

            <div className="border border-[#e2e2df] rounded-[6px] divide-y divide-[#f2f2f0] text-[13px]">
              <div className="p-3 flex justify-between">
                <span className="text-[#666]">Scholar:</span>
                <span className="font-bold text-[#171717]">{user?.fullName} ({user?.studentProfile?.rollNumber})</span>
              </div>
              <div className="p-3 flex justify-between">
                <span className="text-[#666]">Department:</span>
                <span className="font-bold text-[#171717]">
                  {user?.studentProfile?.department?.name || "CSE"}
                </span>
              </div>
              <div className="p-3 flex justify-between">
                <span className="text-[#666]">Assigned Supervisor:</span>
                <span className="font-bold text-[#171717]">{supervisor?.fullName || "Dr. Alok Verma"}</span>
              </div>
              <div className="p-3 flex justify-between">
                <span className="text-[#666]">Title:</span>
                <span className="font-bold text-[#171717] max-w-lg text-right">{title}</span>
              </div>
              <div className="p-3 flex justify-between">
                <span className="text-[#666]">Thesis Document:</span>
                <span className="font-bold text-[#166534]">{fileName}</span>
              </div>
            </div>

            {/* Declaration Checkbox */}
            <div className="p-4 bg-[#fbf3de] border border-[#daa32f] rounded-[6px] space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={declared}
                  onChange={(e) => setDeclared(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-[12.5px] text-[#171717] leading-relaxed">
                  I hereby declare that this doctoral thesis represents my original research work conducted at NIT Hamirpur.
                  All external literature, datasets, and sources have been duly cited and acknowledged according to the
                  academic integrity ordinances of the Institute.
                </span>
              </label>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-[#f2f2f0]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-[#f2f2f0] text-[#303030] rounded-[6px] text-[13px] hover:bg-[#e2e2df]"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="px-6 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-[7px] text-[13.5px] font-bold shadow-sm"
              >
                {resubmitSubmissionId ? "Submit Revised Version" : "Submit Thesis to Supervisor"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Success Receipt matching Figma 89:1967 */}
        {step === 4 && successReceipt && (
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-8 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 bg-[#edf8ef] text-[#166534] rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
              ✓
            </div>

            <div>
              <h2 className="text-[22px] font-bold text-[#171717]">Thesis Successfully Submitted!</h2>
              <p className="text-[13.5px] text-[#666] mt-1">
                Your submission has been formally logged and routed to your supervisor for academic review.
              </p>
            </div>

            <div className="max-w-md mx-auto p-4 bg-[#f7f7f6] border border-[#e2e2df] rounded-[6px] text-left text-[13px] space-y-2">
              <div className="flex justify-between">
                <span className="text-[#666]">Submission Reference:</span>
                <span className="font-bold text-[#171717]">{successReceipt.submissionReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666]">Version:</span>
                <span className="font-bold text-[#171717]">Version {successReceipt.currentVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666]">Status:</span>
                <span className="font-bold text-[#166534]">{successReceipt.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666]">Initial Reviewer:</span>
                <span className="font-bold text-[#171717]">{supervisor?.fullName || "Supervisor"}</span>
              </div>
            </div>

            <div className="pt-4 flex justify-center gap-4">
              <button
                onClick={() => router.push(`/student/thesis/details?id=${successReceipt.id}`)}
                className="bg-[#16a34a] text-white font-bold px-5 py-2.5 rounded-[7px] text-[13px] hover:bg-[#15803d]"
              >
                View Submission Timeline
              </button>
              <Link
                href="/student/dashboard"
                className="bg-[#f2f2f0] text-[#303030] font-bold px-5 py-2.5 rounded-[7px] text-[13px] hover:bg-[#e2e2df]"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </ApplicationShell>
  );
}

export default function StudentThesisSubmitPage() {
  return (
    <React.Suspense
      fallback={
        <ApplicationShell portalType="student" breadcrumb="Student portal / Thesis Submission">
          <div className="p-8 text-center text-[#666]">Loading submission form...</div>
        </ApplicationShell>
      }
    >
      <ThesisSubmitContent />
    </React.Suspense>
  );
}
