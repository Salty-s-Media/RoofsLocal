"use client";

import React from "react";
import { useRouter } from "next/router";

const STEP_LABELS = ["Account", "Business", "Coverage"];

export default function ContractorRegistration() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [step, setStep] = React.useState(0);

  // Step 1 – Account Info
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [passwordMsg, setPasswordMsg] = React.useState<{
    text: string;
    valid: boolean;
  } | null>(null);

  // Step 2 – Business Info
  const [company, setCompany] = React.useState("");
  const [zipCode, setZipCode] = React.useState("");

  // Step 3 – Coverage Area
  const [coverageZips, setCoverageZips] = React.useState<string[]>([]);
  const [zipInput, setZipInput] = React.useState("");

  function validatePassword(pw: string) {
    const hasUppercase = /[A-Z]/.test(pw);
    const hasSymbol = /[\W_]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    if (!hasUppercase || !hasSymbol || !hasNumber) {
      setPasswordMsg({
        text: "Password must include at least one uppercase letter, one symbol, and one number.",
        valid: false,
      });
    } else {
      setPasswordMsg({ text: "Your password is valid!", valid: true });
    }
  }

  function addZips(raw: string) {
    const newZips = raw
      .split(",")
      .map((z) => z.trim())
      .filter((z) => /^\d{5}$/.test(z) && !coverageZips.includes(z));
    if (newZips.length) setCoverageZips((prev) => [...prev, ...newZips]);
  }

  function handleZipKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addZips(zipInput);
      setZipInput("");
    }
  }

  function handleZipInputBlur() {
    if (zipInput.trim()) {
      addZips(zipInput);
      setZipInput("");
    }
  }

  function removeZip(zip: string) {
    setCoverageZips((prev) => prev.filter((z) => z !== zip));
  }

  function canAdvance(): boolean {
    if (step === 0) {
      return (
        firstName.trim() !== "" &&
        lastName.trim() !== "" &&
        email.trim() !== "" &&
        password.length >= 7 &&
        phone.trim() !== "" &&
        (passwordMsg?.valid ?? false)
      );
    }
    if (step === 1) {
      return company.trim() !== "" && /^\d{5}$/.test(zipCode);
    }
    return true;
  }

  const handleSubmit = async () => {
    if (coverageZips.length === 0) {
      return;
    }

    setLoading(true);

    const companyName = company;
    const allZips = [zipCode, ...coverageZips.filter((z) => z !== zipCode)];

    localStorage.setItem("email", email);

    const msgElement = document.getElementById("msg");

    const resp = await fetch(`/api/user/email/${email}`, { method: "GET" });
    const res = await resp.json();

    const fmtPhone = phone && !phone.startsWith("+") ? `+1${phone}` : phone;

    if (resp.status === 200) {
      if (res.phone === fmtPhone || res.email === email) {
        if (msgElement) {
          msgElement.style.color = "red";
          msgElement.innerText =
            "You are already registered. Redirecting to login...";
        }
        setTimeout(() => router.push("/login"), 3000);
        return;
      }
    }

    const response = await fetch("/api/user/login/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, _password: password }),
    });

    if (response.ok) {
      if (msgElement) {
        msgElement.style.color = "red";
        msgElement.innerText =
          "You are already registered. Redirecting to login...";
      }
      setTimeout(() => router.push("/login"), 3000);
      return;
    }

    try {
      const resp = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          zipCode,
          phone,
          company: companyName,
        }),
      });

      if (resp.status === 200) {
        const responseData = await resp.json();
        const checkoutUrl = responseData.url as string;

        const resp1 = await fetch("/api/user/register/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            phone,
            company: companyName,
            zipCodes: allZips,
            password,
            stripeId: responseData.stripeId,
          }),
        });

        const resp2 = await fetch("/api/hubspot/create-company", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: companyName,
            zip: zipCode,
            phone,
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
      <div className="relative mx-auto w-full max-w-md">
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
          <div
            id="register-form"
            className="bg-white p-8 text-blk rounded-xl shadow-lg"
          >
            <h2 className="text-gray-800 text-center font-bold text-2xl mb-2">
              Welcome!
            </h2>

            {/* Step Progress Indicator */}
            <div className="flex items-center justify-center mb-6">
              {STEP_LABELS.map((label, i) => (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        i <= step
                          ? "bg-gray-800 text-white"
                          : "bg-gray-300 text-gray-500"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <span
                      className={`text-xs mt-1 ${
                        i <= step
                          ? "text-gray-800 font-semibold"
                          : "text-gray-400"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 mb-4 ${
                        i < step ? "bg-gray-800" : "bg-gray-300"
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            <p className="text-center text-sm text-gray-500 mb-4">
              Step {step + 1} of 3
            </p>

            {/* Step 1 – Account Info */}
            {step === 0 && (
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-800"
                  >
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
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
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
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
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    type="password"
                    placeholder="abc123$"
                    minLength={7}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      validatePassword(e.target.value);
                    }}
                    required
                    className="mt-1 block w-full border-gray-300 shadow-sm sm:text-sm rounded-md"
                    style={
                      passwordMsg
                        ? {
                            border: `2px solid ${passwordMsg.valid ? "green" : "red"}`,
                          }
                        : undefined
                    }
                  />
                  {passwordMsg && (
                    <p
                      className="text-sm text-center max-w-[15rem]"
                      style={{ color: passwordMsg.valid ? "green" : "red" }}
                    >
                      {passwordMsg.text}
                    </p>
                  )}
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
                    type="tel"
                    placeholder="(123)-123-1234"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="mt-1 block w-full border-gray-300 shadow-sm sm:text-sm rounded-md"
                  />
                </div>
              </div>
            )}

            {/* Step 2 – Business Info */}
            {step === 1 && (
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="company"
                    className="block text-sm font-medium text-gray-800"
                  >
                    Company Name
                  </label>
                  <input
                    id="company"
                    type="text"
                    placeholder="Company Name"
                    maxLength={32}
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    className="mt-1 block w-full border-gray-300 shadow-sm sm:text-sm rounded-md"
                  />
                </div>
                <div>
                  <label
                    htmlFor="zipCode"
                    className="block text-sm font-medium text-gray-800"
                  >
                    ZIP Code (Home / Primary)
                  </label>
                  <input
                    id="zipCode"
                    type="text"
                    maxLength={5}
                    placeholder="ZIP Code"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    required
                    className="mt-1 block w-full border-gray-300 shadow-sm sm:text-sm rounded-md"
                  />
                </div>
              </div>
            )}

            {/* Step 3 – Coverage Area */}
            {step === 2 && (
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="coverageZips"
                    className="block text-sm font-medium text-gray-800"
                  >
                    Coverage Area ZIP Codes
                  </label>
                  <p className="text-xs text-gray-500 mb-1">
                    Enter ZIP codes separated by commas or press Enter to add
                    (e.g. 33601, 33602, 33603)
                  </p>
                  <input
                    id="coverageZips"
                    type="text"
                    placeholder="Enter a ZIP code..."
                    value={zipInput}
                    onChange={(e) => setZipInput(e.target.value)}
                    onKeyDown={handleZipKeyDown}
                    onBlur={handleZipInputBlur}
                    className="mt-1 block w-full border-gray-300 shadow-sm sm:text-sm rounded-md"
                  />
                </div>

                {coverageZips.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {coverageZips.map((zip) => (
                      <span
                        key={zip}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-800 text-white"
                      >
                        {zip}
                        <button
                          type="button"
                          onClick={() => removeZip(zip)}
                          className="ml-2 text-gray-300 hover:text-white focus:outline-none"
                          aria-label={`Remove ${zip}`}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {coverageZips.length === 0 && (
                  <p className="text-xs text-red-500">
                    Add at least one coverage ZIP code to continue.
                  </p>
                )}
              </div>
            )}

            <p id="msg" className="mt-2 mb-2"></p>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 border border-gray-300 text-gray-800 rounded hover:bg-gray-100"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < 2 ? (
                <button
                  type="button"
                  disabled={!canAdvance()}
                  onClick={() => setStep(step + 1)}
                  className="px-4 py-2 bg-gray-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  disabled={coverageZips.length === 0}
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-gray-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
