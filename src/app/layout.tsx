import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RFQ AI Automation App",
  description: "AI workflow automation to extract Request for Quotes (RFQ) data into Excel securely using Groq.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#0e1117]">
        {children}
      </body>
    </html>
  );
}
