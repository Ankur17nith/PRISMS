"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ApplicationShell } from "@/components/ApplicationShell";
import { useAuth } from "@/lib/auth";
import { api, ReviewQueueItem } from "@/lib/api";

export default function FacultyReviewsPage() {
  const { activeRole } = useAuth();
  const [reviews, setReviews] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const q = await api.getReviewQueue(activeRole || undefined);
        setReviews(q);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeRole]);

  return (
    <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / Thesis Reviews">
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-[26px] font-bold text-[#171717]">Thesis Reviews</h1>
          <p className="text-[14px] text-[#666]">
            Doctoral dissertation reviews conducted under active role:{" "}
            <span className="font-bold text-[#daa32f]">{activeRole || "SUPERVISOR"}</span>
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#666]">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-8 text-center shadow-sm">
            <p className="text-[14px] text-[#666]">No review records found.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#e2e2df] rounded-[8px] shadow-sm overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#f7f7f6] text-[#666] font-bold border-b border-[#e2e2df]">
                <tr>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Scholar</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f2f0]">
                {(Array.isArray(reviews) ? reviews : []).map((r) => (
                  <tr key={r.assignmentId} className="hover:bg-[#fafaf9]">
                    <td className="py-3 px-4 font-mono font-bold text-[#171717]">
                      {r.submission.submissionReference} (v{r.submission.currentVersion})
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#171717] block">{r.submission.student.user.fullName}</span>
                      <span className="text-[11px] text-[#666]">{r.submission.student.rollNumber}</span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate font-medium text-[#171717]">{r.submission.title}</td>
                    <td className="py-3 px-4">
                      <span className="bg-[#edf8ef] text-[#166534] text-[11px] font-bold px-2 py-0.5 rounded">
                        {r.submission.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={
                          activeRole === "HOD"
                            ? `/faculty/reviews/${r.submission.id}/hod`
                            : `/faculty/reviews/${r.submission.id}`
                        }
                        className="text-[12.5px] font-bold text-[#16a34a] hover:underline"
                      >
                        Inspect →
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
