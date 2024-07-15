"use client";

import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

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

export default function Dashboard() {
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<UserData>({} as UserData);
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

      console.log("Current User Info: ", result);
    } catch (error) {
      console.error("Check Login Error: ", error);
    }
  };

  useEffect(() => {
    checkLogin();
    setLoaded(true);
    zips.current = user.zipCodes;
  }, []);

  const getMyOrders = async () => {
    try {
      const response = await fetch("/api/hubspot/get-purchased-leads", {
        method: "POST",
        headers: {
          contentType: "application/json",
        },
        body: JSON.stringify({ zipCodes: zips.current }),
      });

      if (!response.ok) {
        console.error("POST error", response.status);
        return;
      }

      const result = await response.json();
      console.log("Current Orders: ", result);
    } catch (error) {
      console.error("Get My Orders Error: ", error);
    }
  };

  const updateInfomation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    if (!formData) return;

    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(`/api/contractors/email/${user.email}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: data.first,
          lastName: data.last,
          // zipCodes: [data.zip],
          email: data.email,
          password: data.password,
        }),
      });

      if (!response.ok) {
        router.push("/");
      }

      const result = await response.json();
      console.log("Updated User Info: ", result);
    } catch (error) {
      console.error("Update Information Error: ", error);
    }
  };

  return (
    <div className="min-h-screen w-full justify-center flex flex-col my-6">
      <div className="ml-12 mr-12">
        {loaded && (
          <>
            <h1 className="text-5xl font-bold">Dashboard</h1>
            <div className="ml-4">
              <h2 className="text-2xl font-semibold mt-4">
                Welcome, {user.firstName} {user.lastName}
              </h2>
              <p>Company: {user.company}</p>
              <p>Email: {user.email}</p>
              <p>Phone: {user.phone}</p>
              <p>Zip Codes: {user.zipCodes}</p>
              <br></br>
              <h3>Account Information</h3>
              <p>Created: {user.createdAt}</p>
              <p>Updated: {user.updatedAt}</p>
              <p>Session Expiry: {user.sessionExpiry}</p>
              <br></br>
              <h1>Zip Codes</h1>
              <div>{user.zipCodes}</div>
              <br></br>
              <button
                onClick={getMyOrders}
                className="bg-blue-500 hover:bg-blue-700 text-white text-center font-bold py-2 px-4 rounded mt-8"
              >
                Get all Orders
              </button>
            </div>
          </>
        )}
        <form onSubmit={updateInfomation} className="bg-acc1 rounded-md p-8">
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

          {/* <label htmlFor="zip" className="text-md font-bold text-white">
            Zip
          </label>
          <input
            type="file"
            name="zip"
            className="mt-1 w-full border-blue-300 shadow-sm sm:text-sm rounded-md text-blk"
          /> */}

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
      </div>
    </div>
  );
}
