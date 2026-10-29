import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "PRISMS — PhD Research & Institutional Scholars Management System | NIT Hamirpur",
  description: "Doctoral milestones, thesis submissions, and academic workflow management for NIT Hamirpur",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
      { url: "/assets/nith-logo.png", type: "image/png", sizes: "224x224" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
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
