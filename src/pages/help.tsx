import Link from "next/link";
import HowToKey from "../../_components/home/contractor/HowToKey";

export default function HelpPage() {
  return (
    <div className="min-h-screen w-full justify-center flex flex-col items-center bg-blk">
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
            <h3 className="text-xl font-semibold mb-2">Welcome!</h3>
            <p className="mb-2">
              Welcome to Roofs Local, the easiest way to aquire leads for your
              roofing business. This guide will walk you through the
              registration process, payment information, and how to use the app
              to its full potential. If you have any questions, please reach out
              to us at{" "}
              <a
                className="text-underline text-blue-500"
                href="mailto:marketing@saltysmedia.com"
              >
                marketing@saltysmedia.com.
              </a>
            </p>
            <p className="font-medium">
              Step 1: Registration Process
              <br />
              <p className="font-normal">
                This can be done on the homepage of the website, or by clicking
                the Register Now button above.
              </p>
              <br></br>
              Step 2: Payment Information
              <br />
              <p className="font-normal">
                This screen is visible just after you submit your registration
                form. Accepted Card Brands are Visa, Mastercard, American
                Express, and Discover.
              </p>
              <br></br>
              Step 3: Logging In
              <br />
              <p className="font-normal">
                Click the Login button on the homepage. You will be redirected
                to the Dashboard after logging in.
              </p>
              <br></br>
              Step 4: Adding Zip Codes
              <br />
              <p className="font-normal">
                This can be done on the Dashboard, in the Update Zip Codes form.
                Ensure the format of the zip codes is a valid US zip code,
                either 5 or 9 digits, with an optional hyphen. (e.g., 12345, or
                12345-6789)
              </p>
              <br></br>
              Step 5: Billing Process
              <br />
              <p className="font-normal">
                The Zip Codes you add via your Dashboard are automatically
                billed for at 5AM EST for all the leads received.
              </p>
              <br></br>
              Step 6: Receiving Leads
              <br />
              <p className="font-normal">
                The leads will be sent to your email and phone number as soon as
                they are received & billed for.
              </p>
              <br></br>
              (Optional) Step 7: Hubspot Integration
              <br />
              <p className="font-normal">
                This can be done from the dashboard of the website. See this
                step below for a video walkthrough.
              </p>
            </p>
          </li>

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
                Be sure to save your email and password somewhere safe for
                loggin in.
              </li>

              <li>
                You will have the option to provide the HubSpot API Key for
                auto-import (optional). See Step 7 for more information.
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
              <li>
                Enter your card number, expiration date, CVC, Name, and Billing
                Zip Code.
              </li>
              <li>Submit these payment details.</li>
              <li>
                You will be redirected to the login page after submitting the
                payment information.
              </li>
            </ul>
          </li>

          <li className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">Logging In</h3>
            <p className="mb-2">
              You will be automatically redirected to the log in page after
              signing up for the first time, be sure to use the email and
              password you set up in the registration form.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You should now see the Login page.</li>
              <li>Enter your email and password.</li>
              <li>
                Click &quot;Login&quot;, which will bring you to the Dashboard.
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
              <li>Click &quot;Update Zip Codes&quot;</li>
              <li>The zip codes have now been added for billing purposes.</li>
            </ul>
          </li>

          <li className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">Removing Zip Codes</h3>
            <p className="mb-2">
              If you would like to remove a zip code from your account, you can
              do so by following these steps:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Scroll down to find &quot;Remove Zip Codes&quot;.</li>
              <li>
                Click the &quot;Remove&quot; button next to the zip code you
                would like to remove.
              </li>
              <li>
                The zip code has now been removed from your account and will not
                be billed for any leads in that area.
              </li>
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
            <h3 className="text-xl font-semibold mb-2">Receiving Leads</h3>
            <p>
              As soon as we receive a lead that matches your zip codes, we will
              send you an email and text message with the lead information. The
              email will contain the lead&quot;s name, phone number, and
              address. The text message will contain the lead&quot;s name and
              phone number. If you would like to view all of your leads in one
              place, you can always log in to the Roofs Local dashboard.
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
