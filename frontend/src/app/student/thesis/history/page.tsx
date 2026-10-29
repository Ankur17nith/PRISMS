"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ApplicationShell } from "@/components/ApplicationShell";
import { api, SubmissionItem } from "@/lib/api";

export default function StudentSubmissionHistoryPage() {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const list = await api.getMySubmissions();
        setSubmissions(list);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <ApplicationShell portalType="student" breadcrumb="Student portal / Submission History">
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-[26px] font-bold text-[#171717]">Submission History</h1>
          <p className="text-[14px] text-[#666]">
            All historical thesis versions are retained indefinitely in the institutional repository.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#666]">Loading submission history...</div>
        ) : submissions.length === 0 ? (
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-8 text-center shadow-sm">
            <p className="text-[14px] text-[#666] mb-3">No submission history found.</p>
            <Link
              href="/student/thesis/submit"
              className="inline-block bg-[#16a34a] text-white font-bold text-[13px] px-4 py-2 rounded-[6px]"
            >
              Start Initial Submission →
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#e2e2df] rounded-[8px] shadow-sm overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#f7f7f6] border-b border-[#e2e2df] text-[#666] font-bold">
                <tr>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f2f0]">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#fafaf9]">
                    <td className="py-3 px-4 font-bold text-[#171717]">v{sub.currentVersion}</td>
                    <td className="py-3 px-4 font-mono text-[12px] text-[#171717]">{sub.submissionReference}</td>
                    <td className="py-3 px-4 font-medium text-[#171717] max-w-xs truncate">{sub.title}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11.5px] font-bold px-2.5 py-0.5 rounded-[4px] ${
                          sub.status === "APPROVED"
                            ? "bg-[#edf8ef] text-[#166534]"
                            : sub.status === "REVISION_REQUIRED"
                            ? "bg-[#fff7e6] text-[#8a570d]"
                            : sub.status === "REJECTED"
                            ? "bg-[#fff1ef] text-[#b42318]"
                            : "bg-[#edf8ef] text-[#166534]"
                        }`}
                      >
                        {sub.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#666] text-[12px]">
                      {sub.submittedAt
                        ? new Date(sub.submittedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Draft"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/student/thesis/details?id=${sub.id}`}
                        className="text-[12.5px] font-bold text-[#16a34a] hover:underline"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ApplicationShell>
  );
}
