"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function UpdatePayment() {
  let sessionId = "";
  const router = useRouter();
  const [done, setDone] = useState(false);

  async function finishUpdate(sessionId: string) {
    //Find the customer email before here
    const req = await fetch("/api/stripe/find-customer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "mart@mail.com" }),
    });

    if (!req.ok) {
      console.error("HTTP error", req.status);
      return;
    }

    const res = await req.json();

    const customerId = res.customerId;

    const req1 = await fetch("/api/stripe/update-payment-method", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerId: customerId, sessionId: sessionId }),
    });

    const res1 = await req1.json();
    console.log(res1);

    if (req1.status === 200) {
      setDone(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    }
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    sessionId = urlParams.get("session_id") || "";
    finishUpdate(sessionId);
  }, []);

  return (
    <div className="min-h-screen w-full justify-center flex flex-col my-6">
      <div className="relative items-center flex flex-col w-full">
        <div className="relative mx-auto space-y-6">
          {done ? (
            <h3>Updating Complete. Redirecting...</h3>
          ) : (
            <h3>Updating...</h3>
          )}
        </div>
      </div>
    </div>
  );
}
