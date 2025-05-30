import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SupabaseClientProvider } from "../contexts/SupabaseClientProvider";
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Respon Warga App",
  description: "Aplikasi pelaporan dan respon warga",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SupabaseClientProvider>
          {children}
          <Toaster position="bottom-right" />
        </SupabaseClientProvider>
      </body>
    </html>
  );
}
