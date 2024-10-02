"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Success() {
  const router = useRouter();
  const [remainingTime, setRemainingTime] = useState(3);

  const saveId = async () => {
    // const email = localStorage.getItem("email") as string;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id") || "";

    console.log("Stripe Session ID: ", sessionId);

    // needs to be fixed
    // await fetch(`/api/user/email/${email}`, {
    //   method: "PUT",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({ stripeSessionID: sessionId }),
    // });
  };

  useEffect(() => {
    saveId();
    setTimeout(() => {
      router.push("/login");
    }, remainingTime * 1000);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (remainingTime === 1) {
        clearInterval(intervalId);
        router.push("/login");
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
          You have successfully been registered in our system.<br></br>{" "}
          Redirecting you to our login page.
        </h1>
        {remainingTime > 0 && (
          <p className="text-xl mb-4">
            Redirecting to login in {remainingTime} seconds...
          </p>
        )}
        <button
          onClick={() => router.push("/login")}
          className="bg-acc1 hover:bg-acc2s text-white font-bold py-2 px-4 rounded"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}
