"use client";

import { useEffect, useState } from "react";

interface ResultItem {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
}

export default function Success() {
  let zipCode = "";
  let sessionId = "";
  const [waiting, setWaiting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    zipCode = localStorage.getItem("ZIPCode") as string;
    const urlParams = new URLSearchParams(window.location.search);
    sessionId = urlParams.get("session_id") || "";
  }, []);

  const handleChargeLater = async () => {
    if (sessionId) {
      setWaiting(true);

      // Call the count of available leads. Returns Customer information.
      const req = await fetch("/api/hubspot/count-leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ zipCode }),
      });
      if (!req.ok) {
        console.error("POST error", req.status);
        return;
      }

      const res = await req.json();
      const leadCount = res.count as number;
      const customerInfo = res.customerInfo;
      const idResults = res.ids;
      console.log(`Counted ${leadCount} leads on the frontend`);

      if (leadCount === 0) {
        console.error("No Available Leads.");
        return;
      }

      if (customerInfo === undefined || idResults === undefined) {
        console.error("Bad Data.");
        return;
      }

      console.log(
        `Customer Information for lead package: ${customerInfo.map(
          (contact: ResultItem) =>
            `${contact.id},${contact.email},${contact.firstname},${contact.lastname},${contact.phone}`
        )}`
      );

      const csvContent = ["ID,Email,First Name,Last Name,Phone"].concat(
        customerInfo.map(
          (contact: ResultItem) =>
            `${contact.id},${contact.email},${contact.firstname},${contact.lastname},${contact.phone}`
        )
      );

      // Get Company by Zip
      const req2 = await fetch("/api/hubspot/get-company", {
        method: "GET",
      });
      if (!req2.ok) {
        console.log(req2.text());
        console.error("HTTP error", req2.status);
        return;
      }

      const res2 = await req2.json();
      let company = res2.data.results[0].properties.company;
      let zipcode = res2.data.results[0].properties.zip as string;

      console.log("Companies Info: ", company, zipcode);

      // Update leads by zip code
      const req3 = await fetch("/api/hubspot/update-leads", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ company, idResults }),
      });
      if (!req.ok) {
        console.error("HTTP error", req.status);
        return;
      }

      const IDList = await req3.json();
      console.log("Frontend: Leads were Updated By ID: ", IDList);

      // Save this list of ID's for later use. Its a unique reference to all the customers that have been purchased.

      const req4 = await fetch("/api/stripe/charge-later", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId, leadCount }),
      });

      if (!req4.ok) {
        console.error("HTTP error", req4.status);
        return;
      }

      const data = await req4.json();
      const { leads, amount, customerId } = data;

      // Save CustomerID for later use. This reference can be used to update & delete payment methods.

      if (!data) {
        throw new Error(`Stripe handling failed...${req4.statusText}`);
      }

      if (data) {
        // Testing Only
        console.log(
          `Transaction Data for Customer ${customerId}: ${leads} lead(s) and $${amount}`,
          data
        );
        console.log("CSV: ", csvContent);

        // Create a Blob from the CSV content
        const blob = new Blob([csvContent.join("\n")], {
          type: "text/csv;charset=utf-8;",
        });

        // Email this out to them as well. Later we will need to SMS too.
        // ------------ USE RESEND API HERE ------------
        // ------------ USE RELEVANT PHONE SMS API HERE ----------

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `contactsFor${zipCode}.csv`;
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          setWaiting(false);
          setLoaded(true);
        }, 2000);
        // setTimeout(() => {
        //   window.location.href = `${process.env.NEXT_PUBLIC_SERVER_URL}/dashboard`;
        // }, 2000);
      }
    }
  };

  return (
    <div className="min-h-screen w-full justify-center flex flex-col my-6">
      <div className="relative items-center flex flex-col w-full">
        <div className="relative mx-auto space-y-6">
          <div>
            You Successfully created a payment intent. Click on the button below
            to be auto-billed when matching ZIP Codes appear for your area...
          </div>

          <button
            className="bg-blue-500 hover:bg-blue-700 text-white text-center font-bold py-2 px-4 rounded"
            onClick={handleChargeLater}
            disabled={waiting}
          >
            {loaded ? `Successfully Billed` : ``}
            {waiting
              ? `Searching & Billing...`
              : `Search for Leads and Auto-Bill`}
          </button>
        </div>
      </div>
    </div>
  );
}
