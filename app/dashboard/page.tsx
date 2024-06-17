"use client";

import BillingManagement from "@/_components/home/contractor/update/UpdatePayment";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [form, showForm] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const data = Object.fromEntries(formData.entries());

    // Testing Only
    console.log(JSON.stringify(data));

    if (!data.email || !data.phone || !data.zipCode || !data.company) {
      console.error("Missing input fields");
      return;
    }

    const req = await fetch("/api/hubspot/edit-info", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: data.email,
        phone: data.phone,
        zipCode: data.zipCode,
        company: data.company,
      }),
    });

    if (!req.ok) {
      console.error("HTTP error", req.status);
      return;
    }

    const res = await req.json();

    console.log(res);
    showForm(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col my-6 mx-24">
      <h1>Welcome to the Dashboard.</h1>
      <div className="mt-6">
        <h1 className="text-left font-bold text-4xl my-6">
          Contractor Dashboard
        </h1>
        <div className="text-black font-bold text-1xl">
          <div className="my-6">
            <h1 className="text-left font-bold text-2xl my-4">
              Edit Personal Information
            </h1>
            <button
              onClick={() => showForm(!form)}
              className="bg-blue-500 hover:bg-blue-700 text-white text-center font-bold py-2 px-4 rounded"
            >
              Edit Personal Information
            </button>
            {form && (
              <div className="relative max-w-[350px] p-8 rounded-xl bg-white shadow-lg">
                <form className="font-normal" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-800"
                      >
                        Email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Email"
                        required
                        className="mt-1 block w-full border-gray-300 shadow-sm sm:text-sm rounded-md"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Phone
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="(123)-123-1234"
                        required
                        className="mt-1 block w-full border-gray-300 shadow-sm sm:text-sm rounded-md"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="zipCode"
                        className="block text-sm font-medium text-gray-800"
                      >
                        ZIP Code
                      </label>
                      <input
                        id="zipCode"
                        name="zipCode"
                        type="text"
                        maxLength={5}
                        placeholder="ZIP Code"
                        required
                        className="mt-1 block w-full border-gray-300 shadow-sm sm:text-sm rounded-md"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="company"
                        className="block text-sm font-medium text-gray-800"
                      >
                        Company Name
                      </label>
                      <input
                        id="company"
                        name="company"
                        type="text"
                        placeholder="Company Name"
                        maxLength={32}
                        required
                        className="mt-1 block w-full border-gray-300 shadow-sm sm:text-sm rounded-md"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="mt-4 w-full p-2 bg-gray-800 text-white rounded"
                  >
                    Save
                  </button>
                </form>
              </div>
            )}
          </div>
          <div className="my-6">
            <h1 className="text-left font-bold text-2xl my-4">
              Add More Zip Codes
            </h1>
            <button className="bg-blue-500 hover:bg-blue-700 text-white text-center font-bold py-2 px-4 rounded">
              Add More Zip Codes
              {/* (Sanitize a .CSV - safer than multi-line input.
            The add it to the multi-line field 'zip' in Hubspot. Have to add
            support for removal and updating though...) */}
            </button>
          </div>
        </div>
        <div className="my-6">
          <h1 className="text-left font-bold text-2xl my-4">
            All Purchased Leads
          </h1>
          <button className="bg-blue-500 hover:bg-blue-700 text-white text-center font-bold py-2 px-4 rounded">
            Download All My Leads
            {/* get all leads with hs_lead_status "CONNECTED" for 'company' name. Pack into .CSV's */}
          </button>
        </div>
        <div className="my-6">
          <h1 className="text-left font-bold text-2xl my-4">
            Cancel or Update Billing
          </h1>
          <BillingManagement />
        </div>
      </div>
    </div>
  );
}
