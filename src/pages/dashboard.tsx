"use client";

import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import BillingManagement from "../../_components/home/contractor/update/UpdateContractor";
import HowToKey from "../../_components/home/contractor/HowToKey";

interface UserData {
  company: string;
  createdAt: string;
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  phone: string;
  sessionExpiry: string;
  stripeId: string;
  updatedAt: string;
  zipCodes: string[];
}

interface Contact {
  createdate: string;
  email: string;
  firstname: string;
  hs_object_id: string;
  id: string;
  job_status: string | null;
  lastmodifieddate: string;
  lastname: string;
  phone: string;
  plan: string | null;
}

export default function Dashboard() {
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<UserData>({} as UserData);
  const [leads, setLeads] = useState([] as Contact[]);
  const [error, setError] = useState(false);
  const zips = useRef([] as string[]);

  const router = useRouter();

  // check login anytime we're on the dashboard page, especially after a refresh
  const checkLogin = async () => {
    try {
      const response = await fetch("/api/user/whoami/whoami", {
        method: "GET",
      });

      if (!response.ok) {
        router.push("/");
      }

      const result = await response.json();

      setUser(result);

      zips.current = user.zipCodes;

      console.log("Current User Info: ", result);
    } catch (error) {
      console.error("Check Login Error: ", error);
    }
  };

  useEffect(() => {
    checkLogin();
    setLoaded(true);
  }, []);

  const getMyOrders = async () => {
    try {
      const response = await fetch("/api/hubspot/get-purchased-leads", {
        method: "POST",
        headers: {
          contentType: "application/json",
        },
        body: JSON.stringify({ zipCodes: user.zipCodes }),
      });

      if (!response.ok) {
        console.error("POST error", response.status);
        return;
      }

      const result = await response.json();
      setLeads(result.customerInfo);
    } catch (error) {
      console.error("Get My Orders Error: ", error);
    }
  };

  const updateInfomation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    if (!formData) return;

    event.currentTarget.reset();

    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(`/api/user/email/${user.email}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: data.first,
          lastName: data.last,
          email: data.email,
          password: data.password,
        }),
      });

      if (!response.ok) {
        router.push("/");
      }

      const result = await response.json();
      console.log("Updated User Info: ", result);

      // set the new user info...
      setUser(result);
    } catch (error) {
      console.error("Update Information Error: ", error);
    }
  };

  const submitHubspotKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    event.currentTarget.reset();

    if (!formData) return;

    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(`/api/user/email/${user.email}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hubspotKey: data.hubspotKey,
          password: data.password,
        }),
      });

      if (!response.ok) {
        router.push("/");
      }

      const result = await response.json();
      console.log("Updated Hubspot Key: ", result);
    } catch (error) {
      console.error("Update Information Error: ", error);
    }
  };

  const updateZipCodes = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    if (!formData) return;

    event.currentTarget.reset();

    const data = Object.fromEntries(formData.entries());

    const zipCodes: string[] = [];

    // First, get the entire list of existing zips.
    try {
      const companyInfo = await fetch(`/api/user/email/${user.email}`, {
        method: "GET",
      });

      if (!companyInfo.ok) {
        console.error("POST error", companyInfo.status);
        return;
      }

      const info = await companyInfo.json();
      // const companyName = info.company;
      // const companyEmail = info.email;
      zipCodes.push(...info.zipCodes); // push all the existing zip codes into the array
    } catch (error) {
      console.error("Update Information Error: ", error);
    }

    const newZips: string[] = [];

    newZips.push(...(data.zipCodes as unknown as string).split(","));

    const pattern = /^\d{5}(-\d{4})?$/;

    newZips.forEach((zip: string, index: number) => {
      console.log(`zip: ${index}`, zip);
      if (zip === zipCodes.at(index)) {
        document.getElementById("error")!.innerText =
          "Error updating zip codes. Zip was a duplicate.";
        setTimeout(() => {
          document.getElementById("error")!.innerText = "";
        }, 4000);
        setError(true);
        return;
      }
      if (typeof zip !== "string") {
        document.getElementById("error")!.innerText =
          "Error updating zip codes. Zip wasn't correct length.";
        setTimeout(() => {
          document.getElementById("error")!.innerText = "";
        }, 4000);
        setError(true);
        return;
      } else if (!zip.match(pattern)) {
        document.getElementById("error")!.innerText =
          "Error updating zip codes. Ensure the format is correct and try again.";
        setTimeout(() => {
          document.getElementById("error")!.innerText = "";
        }, 4000);
        setError(true);
        return;
      } else {
        return zipCodes.push(zip);
      }
    });

    // Then, update the zip codes with the new zip codes by pushing in the new ones from the form data.

    // zipCodes.push(...(data.zipCodes as unknown as string).split(","));

    console.log("updated zips and error: ", zipCodes, error);
    if (!error) {
      try {
        const response = await fetch(`/api/user/email/${user.email}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            zipCodes: zipCodes,
            password: data.password, // required for the PUT request
          }),
        });

        if (response.status === 200) {
          document.getElementById("success")!.innerText = "Zip Codes Updated!";
          setTimeout(() => {
            document.getElementById("success")!.innerText = "";
          }, 4000);
        }

        const result = await response.json();
        console.log("Updated Zip Codes: ", result);

        setUser(result); // Display updated user info
      } catch (error) {
        console.error("Update Information Error: ", error);
      }
    }
  };

  return (
    <div className="min-h-screen w-full justify-center flex flex-col my-6">
      <div className="ml-12 mr-12">
        {loaded && (
          <div className="mt-[120px] bg-gray-600 p-8 rounded-md ">
            <h1 className="text-5xl font-bold">Dashboard</h1>
            <div>
              <h2 className="text-2xl font-semibold mt-4 mb-4">
                Welcome, {user.firstName} {user.lastName}
              </h2>
              <div className="flex flex-row align-top gap-x-4">
                <div>
                  <p>Company: {user.company}</p>
                  <p>Email: {user.email}</p>
                  <p>Phone: {user.phone}</p>
                  <p>Zip Codes:</p>
                  <p>{user.zipCodes}</p>
                </div>
                <div>
                  <h3>Account Information</h3>
                  <p>Created: {user.createdAt}</p>
                  <p>Updated: {user.updatedAt}</p>
                  <p>Session Expiry: {user.sessionExpiry}</p>
                </div>
              </div>

              <br></br>
              <h2 className="text-2xl font-semibold mt-4 mb-4">Orders</h2>
              <div>
                {leads.length === 0 ? (
                  <p>No orders found</p>
                ) : (
                  <p>Orders were found: </p>
                )}
                {leads.map((contact) => (
                  <div key={contact.id}>
                    <p>First Name: {contact.firstname}</p>
                    <p>Last Name: {contact.lastname}</p>
                    <p>Email: {contact.email}</p>
                    <p>Phone: {contact.phone}</p>
                    <br></br>
                  </div>
                ))}
              </div>
              <button
                onClick={getMyOrders}
                className="bg-blue-500 hover:bg-blue-700 text-white text-center font-bold py-2 px-4 rounded mt-8"
              >
                Show all Orders
              </button>
            </div>
          </div>
        )}
        <br></br>
        <form
          onSubmit={updateZipCodes}
          className="bg-darkG rounded-md p-8 max-w-[512px]"
        >
          <h1 className="mb-4 font-bold text-2xl">Update Zip Codes</h1>
          <p className="mb-4">
            In order for ZIP codes to be added properly, you must sumbit the zip
            codes as a comma seperated list.
          </p>
          <label htmlFor="zipCodes" className="text-md font-bold text-white">
            Zip Codes
          </label>
          <input
            type="text"
            name="zipCodes"
            className="mt-1 mb-4 w-full border-blue-300 shadow-sm sm:text-sm rounded-md text-blk"
            placeholder={"12345, 12346, 12347..."}
          />

          <label htmlFor="password" className="text-md font-bold text-white">
            Password
          </label>
          <input
            type="password"
            name="password"
            required
            className="mt-1 w-full border-blue-300 shadow-sm sm:text-sm rounded-md text-blk"
          />
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white text-center font-bold py-2 px-4 rounded mt-8"
            type="submit"
          >
            Update Zip Codes
          </button>
          <div className="mt-4 mb-4">
            <p
              id="success"
              className="text-md font-semibold text-green-600"
            ></p>
            <p id="error" className="text-md font-semibold text-red-600"></p>
          </div>
        </form>
        <br></br>
        <form
          onSubmit={updateInfomation}
          className="bg-darkG rounded-md p-8 max-w-[512px]"
        >
          <h1 className="mb-4 font-bold text-2xl">Update Information</h1>
          <label htmlFor="first" className="text-md font-bold text-white">
            First
          </label>
          <input
            type="text"
            name="first"
            className="mt-1 w-full border-blue-300 shadow-sm sm:text-sm rounded-md text-blk"
            placeholder={`${user.firstName}`}
          />

          <label htmlFor="last" className="text-md font-bold text-white">
            Last
          </label>
          <input
            type="text"
            name="last"
            className="mt-1 w-full border-blue-300 shadow-sm sm:text-sm rounded-md text-blk"
            placeholder={`${user.lastName}`}
          />
          <label htmlFor="email" className="text-md font-bold text-white">
            Email
          </label>
          <input
            type="email"
            name="email"
            placeholder={`${user.email}`}
            className="mt-1 w-full border-blue-300 shadow-sm sm:text-sm rounded-md text-blk"
          />
          <label htmlFor="password" className="text-md font-bold text-white">
            Password
          </label>
          <input
            type="password"
            name="password"
            required
            className="mt-1 w-full border-blue-300 shadow-sm sm:text-sm rounded-md text-blk"
          />
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white text-center font-bold py-2 px-4 rounded mt-8"
            type="submit"
          >
            Update Information
          </button>
        </form>
        <br></br>

        <HowToKey />
        <form
          onSubmit={submitHubspotKey}
          className="bg-darkG rounded-md p-8 max-w-[512px]"
        >
          <h1 className="mb-4 font-bold text-2xl">Update Hubspot Key</h1>
          <label htmlFor="hubspotKey" className="text-md font-bold text-white">
            Hubspot Key
          </label>
          <input
            type="text"
            name="hubspotKey"
            className="mt-1 w-full border-blue-300 shadow-sm sm:text-sm rounded-md text-blk"
          />
          <label htmlFor="password" className="text-md font-bold text-white">
            Password
          </label>
          <input
            type="password"
            name="password"
            required
            className="mt-1 w-full border-blue-300 shadow-sm sm:text-sm rounded-md text-blk"
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white text-center font-bold py-2 px-4 rounded mt-8"
          >
            Update Hubspot Key
          </button>
        </form>

        <br></br>
        <h2 className="text-2xl font-semibold mt-4 mb-4">Account Settings</h2>
        <BillingManagement email={user.email} />
        <br></br>
      </div>
    </div>
  );
}
