'use client';

import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import BillingManagement from '../../_components/home/contractor/update/UpdateContractor';
import HowToKey from '../../_components/home/contractor/HowToKey';

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
  const [error, setError] = useState(false);
  const zips = useRef([] as string[]);

  const router = useRouter();

  // check login anytime we're on the dashboard page, especially after a refresh
  const checkLogin = async () => {
    try {
      const response = await fetch('/api/user/whoami/whoami', {
        method: 'GET',
      });

      if (!response.ok) {
        router.push('/');
      }

      const result = await response.json();

      setUser(result);

      zips.current = user.zipCodes;

      console.log('Current User Info: ', result);
    } catch (error) {
      console.error('Check Login Error: ', error);
    }
  };

  useEffect(() => {
    checkLogin();
    setLoaded(true);
  }, []);

  const updateInfomation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    if (!formData) return;

    event.currentTarget.reset();

    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(`/api/user/email/${user.email}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: data.first,
          lastName: data.last,
          email: data.email,
          password: data.password,
        }),
      });

      if (!response.ok) {
        router.push('/');
      }

      const result = await response.json();
      console.log('Updated User Info: ', result);

      // set the new user info...
      setUser(result);
    } catch (error) {
      console.error('Update Information Error: ', error);
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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hubspotKey: data.hubspotKey,
          password: data.password,
        }),
      });

      if (!response.ok) {
        router.push('/');
      }

      const result = await response.json();
      console.log('Updated Hubspot Key: ', result);
    } catch (error) {
      console.error('Update Information Error: ', error);
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
        method: 'GET',
      });

      if (!companyInfo.ok) {
        console.error('POST error', companyInfo.status);
        return;
      }

      const info = await companyInfo.json();

      zipCodes.push(...info.zipCodes); // push all the existing zip codes into the array
    } catch (error) {
      console.error('Update Information Error: ', error);
    }

    const newZips: string[] = [];

    newZips.push(
      ...(data.zipCodes as unknown as string)
        .split(',')
        .map((zip) => zip.trim())
    );
    console.log('new zips: ', newZips);

    const pattern = /^\d{5}(-\d{4})?$/;

    newZips.forEach((zip: string, index: number) => {
      console.log(`zip: ${index}`, zip);
      if (zip === zipCodes.at(index)) {
        document.getElementById('error')!.innerText =
          'Error updating zip codes. Zip was a duplicate.';
        setTimeout(() => {
          document.getElementById('error')!.innerText = '';
        }, 4000);
        setError(true);
        return;
      }
      if (typeof zip !== 'string') {
        document.getElementById('error')!.innerText =
          "Error updating zip codes. Zip wasn't correct length.";
        setTimeout(() => {
          document.getElementById('error')!.innerText = '';
        }, 4000);
        setError(true);
        return;
      } else if (!zip.match(pattern)) {
        document.getElementById('error')!.innerText =
          'Error updating zip codes. Ensure the format is correct and try again.';
        setTimeout(() => {
          document.getElementById('error')!.innerText = '';
        }, 4000);
        setError(true);
        return;
      } else {
        return zipCodes.push(zip);
      }
    });

    // Then, update the zip codes with the new zip codes by pushing in the new ones from the form data.

    // zipCodes.push(...(data.zipCodes as unknown as string).split(","));

    console.log('updated zips and error: ', zipCodes, error);
    if (!error) {
      try {
        const response = await fetch(`/api/user/email/${user.email}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            zipCodes: zipCodes,
            password: data.password, // required for the PUT request
          }),
        });

        if (response.status === 200) {
          document.getElementById('success')!.innerText = 'Zip Codes Updated!';
          setTimeout(() => {
            document.getElementById('success')!.innerText = '';
          }, 4000);
        }

        const result = await response.json();
        console.log('Updated Zip Codes: ', result);

        setUser(result); // Display updated user info
      } catch (error) {
        console.error('Update Information Error: ', error);
      }
    }
  };

  const deleteZipCodes = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    if (!formData) return;

    event.currentTarget.reset();

    const data = Object.fromEntries(formData.entries());

    const toDelete: string[] = [];

    toDelete.push(
      ...(data.zipCodes as unknown as string)
        .split(',')
        .map((zip) => zip.trim())
    );
    console.log('delete zips: ', toDelete);

    // Filter out the ZIP codes from the array that are to be deleted.
    const filteredZips = user.zipCodes.filter((zip) => !toDelete.includes(zip));

    const del = await fetch(`/api/user/email/${user.email}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        zipCodes: filteredZips,
        password: data.password, // required for the PUT request
      }),
    });

    if (del.status === 200) {
      document.getElementById('success1')!.innerText = 'Zip Codes Deleted!';
      setTimeout(() => {
        document.getElementById('success1')!.innerText = '';
      }, 4000);
      setUser({
        ...user,
        zipCodes: filteredZips,
      });
    } else {
      document.getElementById('error1')!.innerText =
        'Error deleting zip codes.';
      setTimeout(() => {
        document.getElementById('error1')!.innerText = '';
      }, 4000);
    }
  };

  return (
    <div className="min-h-screen w-full justify-center flex flex-col my-6">
      <div className="ml-10 mr-10">
        {loaded && (
          <div className="mt-[90px] md:mt-[114px] bg-gray-800 p-4 rounded-xl shadow-lg text-white mx-auto sm:p-6">
            <h1 className="text-4xl sm:text-3xl font-extrabold text-gray-100">
              Dashboard
            </h1>
            <div className="mt-6">
              <h2 className="text-2xl sm:text-xl font-bold text-gray-300">
                Welcome, {user.firstName} {user.lastName}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-6">
                <div className="bg-gray-700 p-2 rounded-lg shadow-md">
                  <h3 className="text-lg font-bold text-gray-200 mb-3">
                    User Details
                  </h3>
                  <p className="text-gray-300">
                    <span className="font-bold">Company:</span> {user.company}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-bold">Email:</span> {user.email}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-bold">Phone:</span> {user.phone}
                  </p>
                  <p className="text-gray-300 font-bold mt-3">Zip Codes:</p>
                  <p className="text-gray-300">
                    {user.zipCodes?.slice(0, 10).join(', ')}
                    {user.zipCodes?.length > 10 &&
                      `, +${user.zipCodes.length - 10} more`}
                  </p>
                </div>
                <div className="bg-gray-700 p-2 rounded-lg shadow-md">
                  <h3 className="text-lg font-bold text-gray-200 mb-3">
                    Account Information
                  </h3>
                  <p className="text-gray-300">
                    <span className="font-semibold">Created:</span>{' '}
                    {new Date(user.createdAt).toLocaleString()}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-semibold">Updated:</span>{' '}
                    {new Date(user.updatedAt).toLocaleString()}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-semibold">Session Expiry:</span>{' '}
                    {new Date(user.sessionExpiry).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        <br></br>
        <form
          onSubmit={updateZipCodes}
          className="bg-darkG rounded-md p-8 max-w-[512px]"
        >
          <h1 className="mb-4 font-bold text-2xl">Add Zip Codes</h1>
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
            placeholder={'12345, 12346, 12347...'}
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
          onSubmit={deleteZipCodes}
          className="bg-darkG rounded-md p-8 max-w-[512px]"
        >
          <h1 className="mb-4 font-bold text-2xl">Delete Zip Codes</h1>
          <p className="mb-4">
            In order for ZIP codes to be deleted properly, you must sumbit the
            zip codes as a comma seperated list.
          </p>
          <label htmlFor="zipCodes" className="text-md font-bold text-white">
            Zip Codes
          </label>
          <input
            type="text"
            name="zipCodes"
            className="mt-1 mb-4 w-full border-blue-300 shadow-sm sm:text-sm rounded-md text-blk"
            placeholder={'12345, 12346, 12347...'}
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
            className="bg-red-500 hover:bg-red-700 text-white text-center font-bold py-2 px-4 rounded mt-8"
            type="submit"
          >
            Delete Zip Codes
          </button>
          <div className="mt-4 mb-4">
            <p
              id="success1"
              className="text-md font-semibold text-green-600"
            ></p>
            <p id="error1" className="text-md font-semibold text-red-600"></p>
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

        <h2 className="text-2xl font-semibold mt-4 mb-4">Account Settings</h2>
        <BillingManagement email={user.email} />
        <br></br>
      </div>
    </div>
  );
}
