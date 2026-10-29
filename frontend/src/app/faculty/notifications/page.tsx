"use client";

import React, { useState } from "react";
import { ApplicationShell } from "@/components/ApplicationShell";

export default function FacultyNotificationsPage() {
  const [notifications, setNotifications] = useState([
    {
      id: "1",
      title: "New Thesis Submission Assigned",
      body: "Rahul Sharma (25PHD001) has submitted Thesis TH-2026-001 v2 for your supervisor review.",
      date: "Today, 10:45 AM",
      unread: true,
    },
    {
      id: "2",
      title: "HOD Approval Stage Pending",
      body: "Thesis submission TH-2026-002 v1 is awaiting departmental forwarding to SDPC.",
      date: "Yesterday, 2:10 PM",
      unread: true,
    },
    {
      id: "3",
      title: "Senate Approval Confirmed",
      body: "Arjun Verma (24PHD005) thesis was approved by Chairperson Senate for degree conferment.",
      date: "20 Oct 2026",
      unread: false,
    },
  ]);

  return (
    <ApplicationShell portalType="faculty" breadcrumb="Faculty portal / Notifications">
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-bold text-[#171717]">Faculty Notifications</h1>
            <p className="text-[14px] text-[#666]">
              Real-time workflow alerts, pending review assignments, and committee routing updates.
            </p>
          </div>
          <button
            onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))}
            className="text-[12.5px] font-bold text-[#16a34a] hover:underline"
          >
            Mark all as read
          </button>
        </div>

        <div className="bg-white border border-[#e2e2df] rounded-[8px] p-6 shadow-sm space-y-3">
          <div className="divide-y divide-[#f2f2f0]">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`py-3.5 first:pt-0 last:pb-0 flex items-start gap-3 ${
                  n.unread ? "bg-[#fafaf9] -mx-4 px-4 rounded" : ""
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                    n.unread ? "bg-[#16a34a]" : "bg-transparent"
                  }`}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-[14px] ${n.unread ? "font-bold text-[#171717]" : "text-[#525252]"}`}>
                      {n.title}
                    </h3>
                    <span className="text-[11px] text-[#737373]">{n.date}</span>
                  </div>
                  <p className="text-[12.5px] text-[#666] mt-0.5">{n.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ApplicationShell>
  );
}
