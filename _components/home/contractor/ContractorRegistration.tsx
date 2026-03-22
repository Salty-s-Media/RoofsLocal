"use client";

import React from "react";
import { useRouter } from "next/router";

const STEP_LABELS = ["Account", "Business", "Coverage"];

// ─── Already-Registered Modal ────────────────────────────────────────────────
function AlreadyRegisteredModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [countdown, setCountdown] = React.useState(5);

  React.useEffect(() => {
    if (countdown === 0) {
      router.push("/login");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, router]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-yellow-100 mx-auto mb-4">
          <svg
            className="w-7 h-7 text-yellow-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>

        <h3 className="text-gray-900 font-bold text-lg mb-2">
          Already Registered
        </h3>
        <p className="text-gray-500 text-sm mb-6">
          An account with these credentials already exists. You'll be redirected
          to the login page in{" "}
          <span className="font-semibold text-gray-800">{countdown}s</span>.
        </p>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6 overflow-hidden">
          <div
            className="h-1.5 rounded-full bg-acc2 transition-all duration-1000 ease-linear"
            style={{ width: `${(countdown / 5) * 100}%` }}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
          >
            Stay here
          </button>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="flex-1 px-4 py-2 bg-acc2 text-white rounded-lg text-sm hover:bg-acc1 hover:text-black transition"
          >
            Go to login
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Error Toast ──────────────────────────────────────────────────────────────
function ErrorToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-red-600 text-white text-sm px-5 py-3 rounded-xl shadow-lg">
      <svg
        className="w-4 h-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="ml-2 opacity-70 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ContractorRegistration() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [step, setStep] = React.useState(0);

  // Modal / error state
  const [showAlreadyRegistered, setShowAlreadyRegistered] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

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

  function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

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
        phone.replace(/\D/g, "").length === 10 &&
        (passwordMsg?.valid ?? false)
      );
    }
    if (step === 1) {
      return company.trim() !== "" && /^\d{5}$/.test(zipCode);
    }
    return true;
  }

  const handleSubmit = async () => {
    if (coverageZips.length === 0) return;

    setLoading(true);
    setErrorMessage(null);

    // Primary ZIP is always first; deduplicate if user also added it in step 3
    const allZips = [zipCode, ...coverageZips.filter((z) => z !== zipCode)];
    const companyName = company;

    localStorage.setItem("email", email);

    const rawPhone = phone.replace(/\D/g, "");
    const fmtPhone =
      rawPhone && !rawPhone.startsWith("+") ? `+1${rawPhone}` : rawPhone;

    try {
      // ── 1. Check if email already exists ──────────────────────────────────
      const emailCheckResp = await fetch(`/api/user/email/${email}`, {
        method: "GET",
      });
      const emailCheckData = await emailCheckResp.json();

      if (
        emailCheckResp.status === 200 &&
        (emailCheckData.phone === fmtPhone || emailCheckData.email === email)
      ) {
        setLoading(false);
        setShowAlreadyRegistered(true);
        return;
      }

      // ── 2. Check if credentials already work (i.e. account exists) ────────
      const loginCheckResp = await fetch("/api/user/login/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, _password: password }),
      });

      if (loginCheckResp.ok) {
        setLoading(false);
        setShowAlreadyRegistered(true);
        return;
      }

      // ── 3. Create Stripe checkout session ─────────────────────────────────
      const stripeResp = await fetch("/api/stripe/create-checkout-session", {
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

      if (!stripeResp.ok) {
        throw new Error("Failed to create Stripe checkout session.");
      }

      const stripeData = await stripeResp.json();
      const checkoutUrl = stripeData.url as string;

      // ── 4. Register user ───────────────────────────────────────────────────
      const registerResp = await fetch("/api/user/register/register", {
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
          stripeId: stripeData.stripeId,
        }),
      });

      if (!registerResp.ok) {
        throw new Error("Failed to create your account. Please try again.");
      }

      // ── 5. Create HubSpot company ──────────────────────────────────────────
      const hubspotResp = await fetch("/api/hubspot/create-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companyName, zip: zipCode, phone }),
      });

      if (!hubspotResp.ok) {
        // Non-fatal: log but don't block the user from completing registration
        console.error("HubSpot company creation failed — continuing anyway.");
      }

      // ── 6. Redirect to Stripe checkout ────────────────────────────────────
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error("Registration error:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <>
      {showAlreadyRegistered && (
        <AlreadyRegisteredModal onClose={() => setShowAlreadyRegistered(false)} />
      )}

      {errorMessage && (
        <ErrorToast
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}

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
              className="bg-white p-8 pb-10 text-blk rounded-xl shadow-lg"
            >
              <h2 className="text-gray-800 text-center font-bold text-2xl mb-2">
                {step === 0
                  ? "Create Your Account"
                  : step === 1
                    ? "Your Business"
                    : "Coverage Area"}
              </h2>

              {/* Step Progress Indicator */}
              <div className="flex items-center justify-center mb-6">
                {STEP_LABELS.map((label, i) => (
                  <React.Fragment key={label}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          i <= step
                            ? "bg-acc2 text-white"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {i + 1}
                      </div>
                      <span
                        className={`text-xs mt-1 ${
                          i <= step
                            ? "text-acc2 font-semibold"
                            : "text-gray-400"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {i < STEP_LABELS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 mb-4 ${
                          i < step ? "bg-acc2" : "bg-gray-200"
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
                <div className="space-y-5">
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
                      className="mt-1 block w-full border border-gray-300 px-3 py-2 shadow-sm sm:text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-acc2 focus:border-acc2"
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
                      className="mt-1 block w-full border border-gray-300 px-3 py-2 shadow-sm sm:text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-acc2 focus:border-acc2"
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
                      className="mt-1 block w-full border border-gray-300 px-3 py-2 shadow-sm sm:text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-acc2 focus:border-acc2"
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
                      className="mt-1 block w-full border border-gray-300 px-3 py-2 shadow-sm sm:text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-acc2 focus:border-acc2"
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
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      required
                      className="mt-1 block w-full border border-gray-300 px-3 py-2 shadow-sm sm:text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-acc2 focus:border-acc2"
                    />
                  </div>
                </div>
              )}

              {/* Step 2 – Business Info */}
              {step === 1 && (
                <div className="space-y-5">
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
                      className="mt-1 block w-full border border-gray-300 px-3 py-2 shadow-sm sm:text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-acc2 focus:border-acc2"
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
                      className="mt-1 block w-full border border-gray-300 px-3 py-2 shadow-sm sm:text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-acc2 focus:border-acc2"
                    />
                  </div>
                </div>
              )}

              {/* Step 3 – Coverage Area */}
              {step === 2 && (
                <div className="space-y-5">
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
                      className="mt-1 block w-full border border-gray-300 px-3 py-2 shadow-sm sm:text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-acc2 focus:border-acc2"
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
                    className="px-4 py-2 bg-acc2 text-white rounded hover:bg-acc1 hover:text-black transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-acc2 disabled:hover:text-white"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={coverageZips.length === 0}
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-acc2 text-white rounded hover:bg-acc1 hover:text-black transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-acc2 disabled:hover:text-white"
                  >
                    Submit
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}