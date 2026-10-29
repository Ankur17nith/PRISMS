import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "PRISMS — PhD Research & Institutional Scholars Management System | NIT Hamirpur",
  description: "Doctoral milestones, thesis submissions, and academic workflow management for NIT Hamirpur",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f7f7f6] text-[#303030] antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
