'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/router';
import { FormEvent, useState } from 'react';

export default function Login() {
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [success, setSuccess] = useState(false);
  const [show, setShow] = useState(false);

  function displayErrorMessage() {
    document.getElementById('msg')!.innerText =
      'Invalid email or password. Please try again.';
    document.getElementById('msg')!.style.color = 'red';
    setTimeout(() => {
      document.getElementById('msg')!.innerText = '';
    }, 3000);
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());

    console.log('Login Data: ', data);

    if (!data) return;

    const email = data.email as string;
    const _password = data._password as string;

    try {
      const response = await fetch('/api/user/login/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          _password: _password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // save for future use
        localStorage.setItem('email', email as string);

        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        console.error('Login Error: ', result.error);
        displayErrorMessage();
      }
    } catch (error) {
      console.error('Login Error: ', error);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/user/logout/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/');
      }
    } catch (error) {
      console.error('Logout Error: ', error);
    }
  };

  const forgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());

    if (!data) return;

    const email = data.email as string;

    try {
      const response = await fetch('/api/user/password/forgot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
        }),
      });

      const result = await response.json();

      if (response.status === 200) {
        console.log('Forgot Password Result: ', result);
        setSuccess(true);

        setTimeout(() => {
          setModal(false);
          setSuccess(false);
        }, 5000);
      } else {
        console.error('Forgot Password Error: ', result.error);
      }
    } catch (error) {
      console.error('Forgot Password Error: ', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blk">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
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
            <div className="relative w-full">
              <label
                htmlFor="_password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="_password"
                name="_password"
                type={show ? 'text' : 'password'}
                placeholder="Password"
                className="text-blk mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute inset-y-0 top-6 right-3 flex items-center text-gray-500"
              >
                {show ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
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

        <button
          onClick={() => setModal(true)}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-700 underline"
        >
          Forgot Password
        </button>
        {modal && (
          <>
            <div className="fixed inset-0 flex justify-center items-center w-full h-full bg-blk">
              <div className="bg-white p-4 rounded-lg shadow-md z-20 w-96">
                <h1 className="text-2xl font-bold text-center mb-2 text-blk">
                  Forgot Password
                </h1>
                <p className="text-center text-gray-700 mb-4">
                  Enter your email to get sent a link to reset your password.
                </p>
                {success ? (
                  <>
                    <div className="rounded-md w-full border-4 border-acc2 bg-blk">
                      <p className="text-center font-bold text-white my-8">
                        Email sent successfully! Check your inbox.
                      </p>
                    </div>
                  </>
                ) : (
                  <form onSubmit={forgotPassword}>
                    <div className="mb-4">
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
                    <div className="flex justify-between space-x-2">
                      <button
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-200 hover:bg-gray-300 ease-in-out"
                        onClick={() => setModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-acc2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-200 hover:bg-acc1 ease-in-out"
                      >
                        Submit
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
