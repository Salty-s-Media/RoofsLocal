import Link from "next/link";
import HowToKey from "../../_components/home/contractor/HowToKey";

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
              and click the &quot;Register&quot; button on the homepage.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fill out the registration form.</li>
              <li>
                You have the option to provide the HubSpot API Key for
                auto-import (optional).
              </li>
              <li>Click &quot;Submit&quot; when complete.</li>
            </ul>
          </li>

          <li className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">Payment Information</h3>
            <p className="mb-2">
              Enter your card information and billing details on this screen.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Submit these payment details.</li>
            </ul>
          </li>

          <li className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">Logging In</h3>
            <p className="mb-2">
              You will be automatically redirected to the log in page, using the
              email and password you set up in the registration form.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You should now see the Login page.</li>
              <li>Enter your email and password.</li>
              <li>
                Click &quot;Login&quot;, Which will bring you to the Dashboard.
              </li>
            </ul>
          </li>

          <li className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">Adding Zip Codes</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Scroll down to find &quot;Update Zip Codes&quot;.</li>
              <li>
                Enter desired zip codes using a comma-separated list (e.g.,
                12345, 12346, 12347).
              </li>
              <li>These zip codes will be added for billing purposes.</li>
            </ul>
          </li>

          <li className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">Billing Process</h3>
            <p>
              Contractors are charged once a day at 5AM EST for all the leads
              received for that contractor&quot;s zip code that day. The current
              price per lead is 250 USD, so if Roofs Local sends you 3 leads
              throughout the day, you will be charged 750 USD the next morning.
              We use Stripe for secure and reliable payment and will charge the
              card you submitted on account registration.
            </p>
          </li>
          <li className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">Hubspot Integration</h3>
            <p>
              It is not a must, but if you would like for leads to come into
              your own hubspot account as soon as we get them, Roofs Local needs
              your Hubspot key to do that. Don&quot;t worry, if you follow the
              directions in the tutorial video on the dashboard, the permissions
              will be set so that Roofs Local can only create new contacts, it
              cannot read any data in your Hubspot account such as contacts or
              companies. If you do not have a Hubspot or have not added your key
              yet, you can always view your available leads in the Roofs Local
              dashboard. You will also receive email and text notifications
              whenever we get a new lead that matches your zip codes.
            </p>
            <HowToKey />
          </li>
        </ol>
      </div>
    </div>
  );
}
