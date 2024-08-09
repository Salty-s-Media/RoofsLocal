"use client";

import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <div
      className={`min-h-screen w-full justify-center flex flex-col ${inter.className}`}
    >
      <div className="relative items-center flex flex-col w-full">
        <h1 className="text-3xl font-bold text-center pb-6">
          Welcome to Roofs Local, Contractors!
        </h1>
      </div>
    </div>
  );
}
