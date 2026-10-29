"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#f7f7f6] text-[#303030] flex flex-col justify-between">
      <header className="bg-white border-b border-[#e2e2df] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/assets/nith-emblem.png" alt="" width={48} height={48} className="object-contain" />
          <div>
            <div className="text-[11.5px] text-[#737373] font-devanagari">राष्ट्रीय प्रौद्योगिकी संस्थान हमीरपुर</div>
            <div className="font-bold text-[16px] text-[#171717]">National Institute of Technology Hamirpur</div>
          </div>
        </div>
        <Link href="/" className="text-[13px] font-bold text-[#16a34a] hover:underline">← Back to Portal</Link>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-6 space-y-6">
        <h1 className="text-[28px] font-bold text-[#171717]">Contact Institutional Authorities</h1>
        <p className="text-[14px] text-[#666] leading-relaxed">
          Directory of offices responsible for doctoral administration and PRISMS portal operations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[13px]">
          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm space-y-2">
            <h3 className="font-bold text-[16px] text-[#171717]">Dean (Academic) Office</h3>
            <p className="text-[#666]">Administrative Block, NIT Hamirpur</p>
            <p className="text-[#303030]"><strong>Email:</strong> dean_academics@nith.ac.in</p>
            <p className="text-[#303030]"><strong>Phone:</strong> +91 1972 254011</p>
          </div>

          <div className="bg-white border border-[#e2e2df] rounded-[8px] p-5 shadow-sm space-y-2">
            <h3 className="font-bold text-[16px] text-[#171717]">SDPC Chairperson Office</h3>
            <p className="text-[#666]">Senate Doctoral Programme Committee</p>
            <p className="text-[#303030]"><strong>Email:</strong> sdpc_chair@nith.ac.in</p>
            <p className="text-[#303030]"><strong>Phone:</strong> +91 1972 254012</p>
          </div>
        </div>
      </main>

      <footer className="text-center text-[11px] text-[#737373] py-4 border-t border-[#e2e2df]">
        National Institute of Technology Hamirpur · PRISMS Portal
      </footer>
    </div>
  );
}
