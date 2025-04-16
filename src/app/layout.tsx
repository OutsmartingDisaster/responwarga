import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Respon Warga",
  description: "Platform untuk melaporkan kejadian darurat dan menawarkan bantuan di Indonesia",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased bg-zinc-900 text-zinc-100">
        {children}
      </body>
    </html>
  );
}
