"use client";

import { useState } from "react";

export default function BillingManagement() {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateBilling = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const data = Object.fromEntries(formData.entries());

    //Find the customer ID and payment method ID using email as unique identifier
    const req = await fetch("/api/stripe/find-customer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: data.email }),
    });

    if (!req.ok) {
      console.error("HTTP error", req.status);
      return;
    }

    const res = await req.json();

    const customerId = res.customerId;

    // Create session and process new payment method

    const req1 = await fetch("/api/stripe/create-update-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerId: customerId }),
    });

    if (req1.status === 200) {
      const responseData = await req1.json();
      const checkoutUrl = responseData.url as string;
      window.location.href = checkoutUrl;
    }

    const res1 = await req1.json();

    console.log(res1);

    setIsUpdating(false);
  };

  const handleCancelBilling = async () => {
    // Stripe Customer ID needs to be passed in here...
    // const req = await fetch("/api/stripe/cancel-billing", {
    //   method: "DELETE",
    //   body: JSON.stringify({
    //     customerId: customerId,
    //   }),
    // });
    // if (!req.ok) {
    //   console.error("HTTP error", req.status);
    //   return;
    // }
    // const res = await req.json();
    // console.log(res);
    // console.log("Cancelled billing...");
    // Call delete contact from Hubspot API here
    // const req2 = await fetch("/api/hubspot/delete-contact", {
    //   method: "DELETE",
    // });
    // if (!req2.ok) {
    //   console.error("HTTP error", req2.status);
    //   return;
    // }
    // const res2 = await req2.json();
    // console.log(res2);
    // setTimeout(() => {
    //   window.location.href = `${process.env.NEXT_PUBLIC_SERVER_URL}/`;
    // }, 2000);
  };

  return (
    <div>
      {!isUpdating ? (
        <>
          <button
            onClick={() => setIsUpdating(true)}
            className="bg-blue-500 hover:bg-blue-700 text-white text-center font-bold py-2 px-4 rounded mr-4"
          >
            Update Billing
          </button>
          <button
            onClick={handleCancelBilling}
            className="bg-red-500 hover:bg-red-700 text-white text-center font-bold py-2 px-4 rounded"
          >
            Delete Account
          </button>
        </>
      ) : (
        <div>
          <form onSubmit={handleUpdateBilling}>
            <div>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Email"
                required
                className="mb-4 block border-gray-300 shadow-sm sm:text-sm rounded-md"
              />
            </div>
            <button
              className="bg-blue-500 text-white p-2 rounded-xl"
              type="submit"
            >
              Update Billing
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
