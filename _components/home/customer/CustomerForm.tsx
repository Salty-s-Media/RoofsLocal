"use client";

import { X } from "lucide-react";
import React from "react";

interface CustomerRegistrationProps {
  zipCode: string;
  closeModal: () => void;
}

export default function CustomerRegistration({
  zipCode,
  closeModal,
}: CustomerRegistrationProps) {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());

    console.log("Customer Data", data);

    // Send out ID and ZIP code to DB... data.zip, customer.id from stripe or UID

    // This customer data needs to go to hubspot contacts table...
    try {
      const resp = await fetch("/api/hubspot/create-lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          zip: zipCode,
        }),
      });
      if (resp.status === 200) {
        window.location.href = `${process.env.NEXT_PUBLIC_SERVER_URL}/customer-success`;
        console.log("Created a Contact in Hubspot Successfully.");
        closeModal();
        return;
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <>
      <button onClick={closeModal} className="absolute top-4 left-4">
        <X size={20} />
      </button>
      <div className="bg-white flex flex-col mt-6">
        <div className="relative mx-auto">
          <div className="p-8 rounded-xl bg-white shadow-lg">
            <h2 className="text-blue-500 font-bold text-2xl mb-4">
              Welcome, Customer!
            </h2>
            <form onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-blue-700"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="First Name"
                  required
                  className="mt-1 block w-full border-blue-300 shadow-sm sm:text-sm rounded-md"
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-blue-700"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Last Name"
                  required
                  className="mt-1 block w-full border-blue-300 shadow-sm sm:text-sm rounded-md"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-blue-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email"
                  required
                  className="mt-1 block w-full border-blue-300 shadow-sm sm:text-sm rounded-md"
                />
              </div>
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-blue-700"
                >
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="(123)-123-1234"
                  required
                  className="mt-1 block w-full border-blue-300 shadow-sm sm:text-sm rounded-md"
                />
              </div>
              <div>
                <input
                  id="zip"
                  name="zip"
                  type="text"
                  value={zipCode}
                  readOnly
                  required
                  hidden
                />
              </div>
              <button
                type="submit"
                className="mt-4 w-full p-2 bg-blue-600 text-white rounded"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
