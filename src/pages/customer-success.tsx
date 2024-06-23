"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomerSuccess() {
  const router = useRouter();
  const [remainingTime, setRemainingTime] = useState(30);

  useEffect(() => {
    setTimeout(() => {
      router.push("/");
    }, remainingTime * 1000);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (remainingTime === 1) {
        clearInterval(intervalId);
        router.push("/");
      } else {
        setRemainingTime(remainingTime - 1);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [remainingTime]);

  return (
    <div className="min-h-screen w-full justify-center flex flex-col my-6">
      <div className="relative items-center flex flex-col w-full">
        <h1 className="text-3xl leading-[3rem] font-semibold text-center pb-6">
          You have successfully been registered in our system.<br></br> Expect
          an email from our team soon.✅
        </h1>
        {remainingTime > 0 && (
          <p className="text-xl mb-4">
            Redirecting to home in {remainingTime} seconds...
          </p>
        )}
        <button
          onClick={() => router.push("/")}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
