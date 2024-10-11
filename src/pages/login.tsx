"use client";

import { useRouter } from "next/router";
import { FormEvent } from "react";

export default function Login() {
  const router = useRouter();

  function displayErrorMessage() {
    document.getElementById("msg")!.innerText =
      "Invalid email or password. Please try again.";
    document.getElementById("msg")!.style.color = "red";
    setTimeout(() => {
      document.getElementById("msg")!.innerText = "";
    }, 3000);
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());

    console.log("Login Data: ", data);

    if (!data) return;

    const email = data.email as string;
    const _password = data._password as string;

    try {
      const response = await fetch("/api/user/login/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          _password: _password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        router.push("/dashboard");
      } else {
        console.error("Login Error: ", result.error);
        displayErrorMessage();
      }
    } catch (error) {
      console.error("Login Error: ", error);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/user/logout/logout", {
        method: "POST",
      });

      if (response.ok) {
        router.push("/");
      }
    } catch (error) {
      console.error("Logout Error: ", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blk">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-blk">Login</h1>
        <form onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Email"
                className="text-blk mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label
                htmlFor="_password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="_password"
                name="_password"
                type="password"
                placeholder="Password"
                className="text-blk mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                required
              />
            </div>
          </div>
          <p id="msg" className="mt-2 mb-2"></p>
          <div className="mt-4">
            <button
              type="submit"
              className="w-full flex justify-center my-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-acc2  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-200 hover:bg-acc1 ease-in-out"
            >
              Login
            </button>

            <button
              onClick={() => handleLogout()}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-200 hover:bg-red-600 ease-in-out"
            >
              Logout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
