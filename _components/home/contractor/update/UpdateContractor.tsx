'use client';

import { useState } from 'react';

interface BillProps {
  email: string;
}

export default function BillingManagement({ email }: BillProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [customerID, setCustomerId] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  async function handleUpdateBilling() {
    console.log('Updating billing...');
    //Find the customer ID using email as unique identifier
    const req = await fetch(`/api/user/email/${email}`, {
      method: 'GET',
    });

    if (!req.ok) {
      console.error('HTTP error', req.status);
      return;
    }

    const res = await req.json();

    console.log('Step 1', res);

    const customerId = res.stripeId;
    setCustomerId(customerId as string);

    console.log('Step 2', customerID);

    // detach all old payment methods
    const req2 = await fetch('/api/stripe/detach-payment-method', {
      method: 'POST',
      body: JSON.stringify({
        customerId: customerId,
      }),
    });

    if (!req2.ok) {
      console.error('HTTP error', req2.status);
      return;
    }

    const res2 = await req2.json();

    console.log('step 3', res2);

    // Create session and process new payment method under the same customer account
    const req3 = await fetch('/api/stripe/create-update-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customerId: customerId }),
    });

    if (req3.status === 200) {
      const responseData = await req3.json();
      const checkoutUrl = responseData.url as string;
      window.location.href = checkoutUrl;
    }

    const res3 = await req3.json();

    console.log('step 4', res3);

    setIsUpdating(false);
  }

  async function handleCancelBilling() {
    // delete user from stripe
    const req2 = await fetch('/api/stripe/delete-user', {
      method: 'DELETE',
      body: JSON.stringify({
        customerId: customerID,
      }),
    });
    if (!req2.ok) {
      console.error('HTTP error', req2.status);
      return;
    }
    const res2 = await req2.json();
    console.log(res2);

    // Delete user from database
    const del = await fetch(`/api/user/email/${email}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email }),
    });

    if (!del.ok) {
      console.error('HTTP error', del.status);
      return;
    }

    const res = await del.json();
    console.log(res);

    if (!res.ok) {
      console.error('HTTP error', res.status);
      return;
    }
    setTimeout(() => {
      window.location.href = `${process.env.NEXT_PUBLIC_SERVER_URL}/`;
    }, 2000);
  }

  return (
    <div className="space-y-4">
      {!isUpdating ? (
        <>
          {isCancelling ? null : (
            <button
              onClick={() => setIsUpdating(true)}
              className="bg-blue-500 hover:bg-blue-700 text-white text-center font-bold py-2 px-4 rounded mr-4"
            >
              Update Billing
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-col">
          <p>Are you sure you want to update your billing?</p>
          <div className="flex flex-row gap-x-2 mt-2">
            <button
              onClick={() => handleUpdateBilling()}
              className="bg-red-500 hover:bg-red-700 text-white text-center font-bold py-2 px-4 rounded"
            >
              Yes
            </button>
            <button
              onClick={() => setIsUpdating(false)}
              className="bg-blue-500 hover:bg-blue-700 text-white text-center font-bold py-2 px-4 rounded"
            >
              No
            </button>
          </div>
        </div>
      )}
      {!isCancelling ? (
        <>
          {isUpdating ? null : (
            <button
              onClick={() => setIsCancelling(true)}
              className="bg-red-500 hover:bg-red-700 text-white text-center font-bold py-2 px-4 rounded"
            >
              Delete Account
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-col mt-4 mb-4">
          <p>Are you sure you want to delete your account?</p>
          <div className="flex flex-row gap-x-2 mt-2">
            <button
              onClick={() => handleCancelBilling()}
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
          </div>
        </div>
      )}
    </div>
  );
}
