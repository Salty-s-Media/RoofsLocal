import Link from "next/link";

export default function HelpPage() {
  return (
    <div className="min-h-screen w-full justify-center flex flex-col items-center bg-bgD">
      <div className="container mx-auto px-4 py-8 max-w-3xl mt-[125px]">
        <h2 className="text-2xl font-semibold text-center mb-6">
          Roofs Local App Help Guide
        </h2>

        <div className="flex justify-center space-x-4 mb-8">
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-800 text-white font-medium py-2 px-4 rounded transition-colors duration-300"
          >
            Go Home
          </Link>
          <Link
            href="/contractor"
            className="bg-green-600 hover:bg-green-800 text-white font-medium py-2 px-4 rounded transition-colors duration-300"
          >
            Register Now
          </Link>
        </div>

        <ol className="text-blk list-decimal space-y-6">
          <li className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">Registration Process</h3>
            <p className="mb-2">
              Visit{" "}
              <a
                href="https://www.roofslocal.app/"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://www.roofslocal.app/
              </a>{" "}
              and click the 'Register' button on the homepage.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fill out the registration form.</li>
              <li>
                You have the option to provide the HubSpot API Key for
                auto-import (optional).
              </li>
              <li>Click 'Submit' when complete.</li>
            </ul>
          </li>

          <li className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">Payment Information</h3>
            <p className="mb-2">
              Enter your card information and billing details on the next
              screen.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Submit these payment details.</li>
            </ul>
          </li>

          <li className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">
              Logging In and Updating Zip Codes
            </h3>
            <p className="mb-2">
              Log in using the email and password you set up in the registration
              form.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You should now see the Dashboard.</li>
              <li>Scroll down to find 'Update Zip Codes'.</li>
              <li>
                Enter desired zip codes using a comma-separated list (e.g.,
                12345, 12346, 12347).
              </li>
              <li>These zip codes will be added for billing purposes.</li>
            </ul>
          </li>

          <li className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">
              Customer Form Submission
            </h3>
            <p className="mb-2">
              Visit the customer form submission page at{" "}
              <a
                href="https://roofs-local-customers.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://roofs-local-customers.vercel.app/
              </a>
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fill out the form on the homepage.</li>
              <li>Use one of the zip codes you added in the previous step.</li>
              <li>Submit the form when complete.</li>
            </ul>
          </li>

          <li className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">Billing Process</h3>
            <p className="mb-2">Billing Process:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                If submitted during the day, request manual triggering of the
                Cron Job.
              </li>
              <li>Around 5 AM EST, the automated Cron Job will run.</li>
              <li>The lead will be purchased.</li>
              <li>You'll receive an email with the lead details.</li>
              <li>
                If you provided a HubSpot key, the lead will be imported
                automatically.
              </li>
              <li>Stripe will process the billing.</li>
            </ul>
          </li>
        </ol>
      </div>
    </div>
  );
}
