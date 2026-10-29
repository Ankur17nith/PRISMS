"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ApplicationShell } from "@/components/ApplicationShell";
import { useAuth } from "@/lib/auth";
import { api, ReviewQueueItem } from "@/lib/api";

export default function FacultyQueuePage() {
  const { user, activeRole } = useAuth();
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const q = await api.getReviewQueue(activeRole || undefined);
        setQueue(q);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeRole]);

  const filtered = queue.filter(
    (item) =>
      item.submission.title.toLowerCase().includes(search.toLowerCase()) ||
      item.submission.student.user.fullName.toLowerCase().includes(search.toLowerCase()) ||
      item.submission.submissionReference.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / Approval Queue">
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold text-[#171717]">Approval Queue</h1>
            <p className="text-[14px] text-[#666]">
              Submissions requiring your review decision under role:{" "}
              <span className="font-bold text-[#daa32f]">{activeRole || "SUPERVISOR"}</span>
            </p>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by scholar or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-[#e2e2df] rounded-[7px] px-3 py-2 text-[13px] text-[#171717] focus:outline-none focus:border-[#daa32f]"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#666]">Loading approval queue...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-8 text-center shadow-sm">
            <p className="text-[14px] text-[#666]">
              No active tasks found in queue for role {activeRole || "SUPERVISOR"}.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#e2e2df] rounded-[8px] shadow-sm overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#f7f7f6] text-[#666] font-bold border-b border-[#e2e2df]">
                <tr>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Scholar</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Dissertation Title</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Assigned On</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f2f0]">
                {filtered.map((item) => (
                  <tr key={item.assignmentId} className="hover:bg-[#fafaf9]">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#171717]">
                      {item.submission.submissionReference} (v{item.submission.currentVersion})
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#171717] block">
                        {item.submission.student.user.fullName}
                      </span>
                      <span className="text-[11px] text-[#666]">
                        {item.submission.student.rollNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#666]">
                      {item.submission.student.department.code}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate font-medium text-[#171717]">
                      {item.submission.title}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="bg-[#fff7e6] text-[#8a570d] text-[11px] font-bold px-2 py-0.5 rounded">
                        {item.stage.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[12px] text-[#666]">
                      {new Date(item.assignedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={
                          activeRole === "HOD"
                            ? `/faculty/reviews/${item.submission.id}/hod`
                            : `/faculty/reviews/${item.submission.id}`
                        }
                        className="bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-[12px] px-3 py-1.5 rounded transition inline-block shadow-sm"
                      >
                        Open Workspace →
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
