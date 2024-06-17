"use client";

import CustomerRegistration from "@/_components/home/customer/CustomerForm";
import { useState } from "react";

export default function Home() {
  const [zipCode, setZipCode] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleZipCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.value.length < 6) {
      setZipCode(event.target.value);
    }
  };

  const openModal = () => {
    if (zipCode.length === 5 && zipCode !== "") {
      setIsModalOpen(true);
    } else {
      window.alert("You must provide a valid US Zip Code");
    }
  };
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen w-full justify-center flex flex-col">
      <div className="relative items-center flex flex-col w-full">
        <h1 className="text-3xl font-bold text-center pb-6">
          Sign Up to Hear from Our Contractors
        </h1>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-row items-center space-x-2"
        >
          <input
            type="text"
            placeholder="Enter Zip Code"
            value={zipCode}
            maxLength={5}
            onChange={handleZipCodeChange}
            className="w-full p-2 border rounded-md shadow-sm focus:outline-none focus:border-acc1"
          />
          <button
            type="submit"
            onClick={openModal}
            className="w-auto p-2 bg-acc1 text-white rounded"
          >
            Submit
          </button>
        </form>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-auto">
            <div className="flex items-center justify-center min-h-screen">
              <div className="absolute inset-0 bg-black opacity-60"></div>
              <div className="w-[400px] h-[400px] bg-white rounded-lg shadow-lg transform transition-transform">
                <CustomerRegistration
                  zipCode={zipCode}
                  closeModal={closeModal}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
