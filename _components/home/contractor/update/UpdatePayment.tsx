"use client";

import { useState } from "react";

interface BillProps {
  email: string;
}

export default function BillingManagement({ email }: BillProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [customerID, setCustomerId] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const handleUpdateBilling = async () => {
    //Find the customer ID using email as unique identifier
    const req = await fetch(`/api/user/email/${email}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email }),
    });

    if (!req.ok) {
      console.error("HTTP error", req.status);
      return;
    }

    const res = await req.json();

    const customerId = res.stripeId;
    setCustomerId(customerId);

    // GET customer info from Stripe for the payment method ID
    const req1 = await fetch("/api/stripe/get-user", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerId: customerId }),
    });

    if (!req1.ok) {
      console.error("HTTP error", req1.status);
      return;
    }

    const res1 = await req1.json();

    console.log(res1);

    // detach all old payment methods
    const req2 = await fetch("/api/stripe/detach-payment-method", {
      method: "POST",
      body: JSON.stringify({
        customerId: customerId,
      }),
    });

    if (!req2.ok) {
      console.error("HTTP error", req2.status);
      return;
    }

    const res2 = await req2.json();
    console.log(res2);

    // Create session and process new payment method under the same customer account
    const req3 = await fetch("/api/stripe/create-update-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerId: customerId }),
    });

    if (req3.status === 200) {
      const responseData = await req3.json();
      const checkoutUrl = responseData.url as string;
      window.location.href = checkoutUrl;
    }

    const res3 = await req3.json();

    console.log(res3);

    setIsUpdating(false);
  };

  const handleCancelBilling = async () => {
    const del = await fetch(`/api/user/email/${email}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email }),
    });

    if (!del.ok) {
      console.error("HTTP error", del.status);
      return;
    }

    const res = await del.json();
    console.log(res);

    const req2 = await fetch("/api/stripe/delete-user", {
      method: "DELETE",
      body: JSON.stringify({
        customerId: customerID,
      }),
    });
    if (!req2.ok) {
      console.error("HTTP error", req2.status);
      return;
    }
    const res2 = await req2.json();
    console.log(res2);
    setTimeout(() => {
      window.location.href = `${process.env.NEXT_PUBLIC_SERVER_URL}/`;
    }, 2000);
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mt-4 mb-4">Account Settings</h2>
      {!isUpdating ? (
        <>
          <button
            onClick={() => setIsUpdating(true)}
            className="bg-blue-500 hover:bg-blue-700 text-white text-center font-bold py-2 px-4 rounded mr-4"
          >
            Update Billing
          </button>
        </>
      ) : (
        <div>
          <p>Are you sure you want to update your billing?</p>
          <button
            onClick={handleUpdateBilling}
            className="bg-blue-500 text-white p-2 rounded-xl"
          >
            Update Billing
          </button>
          <button
            onClick={() => setIsUpdating(false)}
            className="bg-blue-500 text-white p-2 rounded-xl"
          >
            Back
          </button>
        </div>
      )}
      {!isCancelling ? (
        <button
          onClick={() => setIsCancelling(true)}
          className="bg-red-500 hover:bg-red-700 text-white text-center font-bold py-2 px-4 rounded"
        >
          Delete Account
        </button>
      ) : (
        <>
          <p>Are you sure you want to delete your account?</p>
          <button
            onClick={handleCancelBilling}
            className="bg-red-500 hover:bg-red-700 text-white text-center font-bold py-2 px-4 rounded"
          >
            Yes
          </button>
          <button
            onClick={() => setIsCancelling(false)}
            className="bg-blue-500 hover:bg-blue-700 text-white text-center font-bold py-2 px-4 rounded"
          >
            No
          </button>
        </>
      )}
    </div>
  );
}
