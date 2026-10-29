"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ApplicationShell } from "@/components/ApplicationShell";
import { api, SubmissionItem } from "@/lib/api";
import { formatDateTime, formatStatusLabel, getStatusBadgeClasses } from "@/lib/statusHelper";

export default function StudentSubmissionHistoryPage() {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.getMySubmissions();
      setSubmissions(Array.isArray(list) ? list : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load submission history.";
      setError(msg);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const submissionList = Array.isArray(submissions) ? submissions : [];

  return (
    <ApplicationShell portalType="student" breadcrumb="Student portal / Submission History">
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-[26px] font-bold text-[#171717]">Submission History</h1>
          <p className="text-[14px] text-[#666]">
            All historical thesis versions are retained indefinitely in the institutional repository.
          </p>
        </div>

        {error && (
          <div className="bg-[#fff1ef] border border-[#b42318] rounded-[8px] p-4 text-[13px] text-[#b42318] flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={loadSubmissions}
              className="px-3 py-1 bg-[#b42318] text-white rounded text-[12px] font-bold hover:bg-[#991b1b] cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-[#666]">Loading submission history...</div>
        ) : submissionList.length === 0 && !error ? (
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-8 text-center shadow-sm">
            <p className="text-[14px] text-[#666] mb-3">No submission history found.</p>
            <Link
              href="/student/thesis/submit"
              className="inline-block bg-[#16a34a] text-white font-bold text-[13px] px-4 py-2 rounded-[6px]"
            >
              Start Initial Submission →
            </Link>
          </div>
        ) : submissionList.length > 0 ? (
          <div className="bg-white border border-[#e2e2df] rounded-[8px] shadow-sm overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#f7f7f6] border-b border-[#e2e2df] text-[#666] font-bold">
                <tr>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted At (IST)</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f2f0]">
                {submissionList.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#fafaf9]">
                    <td className="py-3 px-4 font-bold text-[#171717]">v{sub.currentVersion}</td>
                    <td className="py-3 px-4 font-mono text-[12px] text-[#171717]">{sub.submissionReference}</td>
                    <td className="py-3 px-4 font-medium text-[#171717] max-w-xs truncate">{sub.title}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11.5px] font-bold px-2.5 py-0.5 rounded-[4px] ${getStatusBadgeClasses(
                          sub.status
                        )}`}
                      >
                        {formatStatusLabel(sub.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#666] text-[12px]">
                      {sub.submittedAt ? formatDateTime(sub.submittedAt) : "Draft"}
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
        ) : null}
      </div>
    </ApplicationShell>
  );
}

