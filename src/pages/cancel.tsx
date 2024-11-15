"use client";

import { useRouter } from "next/router";

export default function CancelPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen w-full justify-center flex flex-col">
      <div className="relative items-center flex flex-col w-full">
        <h1 className="text-3xl leading-[3rem] font-semibold text-center pb-6">
          Billing Setup Cancelled
        </h1>
        <p>
          Your registration process has been cancelled. You may return to the
          Home page.
        </p>
        <br></br>
        <button
          onClick={() => router.push("/")}
          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
