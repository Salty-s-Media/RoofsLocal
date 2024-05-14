import dotenv from "dotenv";
import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

dotenv.config();
const inter = Inter_Tight({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Roofs Local",
  description: "The main trusted ZIP provider",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          "bg-background min-h-screen font-sans antialiased",
          inter.variable
        )}
      >
        {children}
      </body>
    </html>
  );
}
