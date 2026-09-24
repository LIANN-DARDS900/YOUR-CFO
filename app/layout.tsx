import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Your CFO — Know where your money goes",
  description: "A private personal CFO for cashflow, cumulative spending leaks, savings, and financial decisions.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
