"use client";

import React from "react";
import { useRouter } from "next/router";

interface FormStruct {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  zipCodes: string[];
}

export default function ContractorRegistration() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  function isPasswordValid(password: string) {
    const passwordInput = document.getElementById("password");
    const errorSpan = document.getElementById("password-error");
    // Check for at least one uppercase letter
    const hasUppercase = /[A-Z]/.test(password);
    // Check for at least one symbol
    const hasSymbol = /[\W_]/.test(password);
    // has number
    const hasNumber = /([0-9]+)/.test(password);

    if (passwordInput && errorSpan) {
      if (!hasUppercase || !hasSymbol || !hasNumber) {
        passwordInput.style.border = "2px solid red";
        errorSpan.style.color = "red";
        errorSpan.textContent =
          "Password must include at least one uppercase letter, one symbol, and one number.";
      } else {
        passwordInput.style.border = "2px solid green";
        errorSpan.style.color = "green";
        errorSpan.textContent = "Your password is valid!";
      }
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);

    const formData = new FormData(event.currentTarget);

    if (!formData) return;

    const data = Object.fromEntries(formData.entries());

    const companyName = formData.get("company");

    // Make available on /success for convenience.
    localStorage.setItem("email", data.email as string);

    // error element
    const msgElement = document.getElementById("msg");
    // first, check that the email or phone number is not already registered by email lookup.
    const resp = await fetch(`/api/user/email/${data.email}`, {
      method: "GET",
    });

    const res = await resp.json();

    if (resp.status === 200) {
      const email = data.email as string;

      const phone = data.phone as string;
      const fmtPhone = phone && !phone.startsWith("+") ? `+1${phone}` : phone;

      if (res.phone === fmtPhone || res.email === email) {
        console.log("Contractor already exists: ", res);
        if (msgElement) {
          msgElement.style.color = "red";
          msgElement.innerText =
            "You are already registered. Redirecting to login...";
        }
        setTimeout(() => {
          router.push("/login");
        }, 3000);
        return;
      }
    } else {
      // the checks could be more robust, but this is a start that doesnt interrupt the registration process.
      console.log("Not registered. Continuing registration process.");
    }

    // Check if user is already registered with a known email and password.
    const response = await fetch("/api/user/login/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: data.email,
        _password: data.password,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      if (msgElement) {
        msgElement.style.color = "red";
        msgElement.innerText =
          "You are already registered. Redirecting to login...";
      }
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } else {
      console.log("Not registered. Continuing registration process.");
    }

    try {
      // Continue creating a session and starting the autobilling process - Then pass down the newly created stripeId to the contractor.
      const resp = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          zipCode: data.zipCode,
          phone: data.phone,
          company: companyName,
        }),
      });
      if (resp.status === 200) {
        const responseData = await resp.json();
        const checkoutUrl = responseData.url as string;

        const resp1 = await fetch("/api/user/register/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            company: companyName,
            zipCodes: [data.zipCode],
            password: data.password,
            hubspotKey: data.hubspotKey,
            stripeId: responseData.stripeId,
          }),
        });

        const resp2 = await fetch("/api/hubspot/create-company", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: companyName,
            zip: data.zipCode,
            phone: data.phone,
          }),
        });

        if (resp2.status === 200) {
          const responseData = await resp2.json();
          console.log("Company created in HubSpot: ", responseData);
        } else {
          console.error("HubSpot company creation error");
          return;
        }

        if (resp1.status === 201) {
          const responseData = await resp1.json();
          console.log("Registered: ", responseData);

          setTimeout(() => {}, 2000);
          window.location.href = checkoutUrl;
          return;
        } else {
          console.error("Prisma record creation error");
        }
      } else {
        console.error("Stripe session creation error");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="flex flex-col">
      <div className=" relative mx-auto">
        {loading ? (
          <>
            <h2 className="text-white text-center font-bold text-2xl mb-4">
              Loading...
            </h2>
            <div className="flex justify-center items-center h-auto mt-auto">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-solid border-green-600"></div>
            </div>
          </>
        ) : (
          <>
            <div
              id="register-form"
              className="bg-white p-8 text-blk rounded-xl shadow-lg"
            >
              <h2 className="text-gray-800 text-center font-bold text-2xl mb-4">
                Welcome!
              </h2>
              <form
                className="bg-white space-y-3 min-w-[250px] max-h-[max-content]"
                onSubmit={handleSubmit}
              >
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-800"
                  >
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="First Name"
                    required
                    className="mt-1 block w-full border-gray-300 shadow-sm sm:text-sm rounded-md"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-800"
                  >
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Last Name"
                    required
                    className="mt-1 block w-full border-gray-300 shadow-sm sm:text-sm rounded-md"
                  />
                </div>
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
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-800"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="abc123$"
                    minLength={7}
                    onChange={(string) => isPasswordValid(string.target.value)}
                    required
                    className="mt-1 block w-full border-gray-300 shadow-sm sm:text-sm rounded-md"
                  />
                  <p
                    id="password-error"
                    className="text-sm text-center max-w-[15rem]"
                  ></p>
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
                <div>
                  <label
                    htmlFor="hubspotKey"
                    className="block text-sm font-medium text-gray-800"
                  >
                    Hubspot Key (Optional)
                  </label>
                  <input
                    id="hubspotKey"
                    name="hubspotKey"
                    type="text"
                    placeholder="Hubspot API Key"
                    maxLength={64}
                    className="mt-1 mb-2 block w-full border-gray-300 shadow-sm sm:text-sm rounded-md"
                  />
                </div>
                <p id="msg" className="mt-2 mb-2"></p>
                <button
                  type="submit"
                  className="w-full p-2 bg-gray-800 text-white rounded"
                >
                  Submit
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
