'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

export default function Navbar() {
  const router = useRouter();
  const [isHome, setIsHome] = React.useState(false);
  const [mobile, setMobile] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  useEffect(() => {
    setIsHome(router.pathname !== '/');

    if (window && window.innerWidth < 782) {
      setMobile(true);
    }
  }, [router.pathname]);

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
  return (
    <nav
      aria-label="navigation"
      className="flex w-full top-0 fixed justify-between items-center z-10 bg-bg border-b-4 border-bgE"
    >
      <div className="flex container mx-auto px-6 py-3 md:flex-row md:justify-between md:items-center">
        <div className="flex justify-between items-center">
          <div>
            <Link className="text-white text-xl font-bold md:text-2xl" href="/">
              {mobile ? (
                <Image
                  width={80}
                  height={62}
                  src="/sml.svg"
                  alt="logo"
                  className="w-[80px] h-[62px]"
                  priority={true}
                />
              ) : (
                <Image
                  width={291}
                  height={90}
                  src="/logo.svg"
                  alt="logo"
                  className="w-[200px] h-[62px] sm:w-[291px] sm:h-[90px]"
                  priority={true}
                />
              )}
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-4 ml-auto">
          {mobile ? (
            <>
              {open ? (
                <div className="fixed top-0 left-0 w-full h-full bg-bg bg-opacity-80 flex justify-center items-center">
                  <div className="flex flex-col space-y-4 text-center">
                    {isHome ? (
                      <>
                        <button
                          onClick={() => {
                            handleLogout();
                          }}
                          className="px-4 py-2 text-white text-sm font-semibold rounded-md bg-acc2 hover:bg-acc1 transition duration-200 ease-in-out"
                        >
                          Logout
                        </button>
                        <button
                          onClick={() => setOpen(false)}
                          className="px-4 py-2 text-white text-sm font-semibold rounded-md bg-gray-700 hover:bg-acc1 transition duration-200 ease-in-out"
                        >
                          Close Menu
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/contractor"
                          onClick={() => setOpen(false)}
                          className="px-5 py-3 text-white text-sm font-semibold rounded-md bg-acc2 hover:bg-acc1 transition duration-200 ease-in-out"
                        >
                          Register
                        </Link>
                        <Link
                          href="/login"
                          onClick={() => setOpen(false)}
                          className="px-4 py-2 text-white text-sm font-semibold rounded-md bg-acc2 hover:bg-acc1 transition duration-200 ease-in-out"
                        >
                          Login
                        </Link>
                        <Link
                          href="/help"
                          onClick={() => setOpen(false)}
                          className="px-4 py-2 text-white text-sm font-semibold rounded-md bg-gray-600 border-2 border-gray-100 hover:bg-gray-800 transition duration-200 ease-in-out"
                        >
                          Help Guide
                        </Link>
                        <button
                          onClick={() => setOpen(false)}
                          className="px-4 py-2 text-white text-sm font-semibold rounded-md bg-gray-700 hover:bg-acc1 transition duration-200 ease-in-out"
                        >
                          Close Menu
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setOpen(true)}
                  className="px-4 py-2 text-white text-sm font-semibold rounded-md bg-acc2 hover:bg-acc1 transition duration-200 ease-in-out"
                >
                  Open Menu
                </button>
              )}
            </>
          ) : (
            <>
              <Link
                href="/"
                className="px-4 py-2 text-white text-sm font-semibold rounded-md bg-acc2 hover:bg-acc1 transition duration-200 ease-in-out"
              >
                Home
              </Link>
              {isHome ? (
                <button
                  onClick={() => {
                    handleLogout();
                  }}
                  className="px-4 py-2 text-white text-sm font-semibold rounded-md bg-acc2 hover:bg-acc1 transition duration-200 ease-in-out"
                >
                  Logout
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-white text-sm font-semibold rounded-md bg-acc2 hover:bg-acc1 transition duration-200 ease-in-out"
                  >
                    Login
                  </Link>
                  <Link
                    href="/help"
                    className="px-4 py-2 text-white text-sm font-semibold rounded-md bg-gray-600 border-2 border-gray-100 hover:bg-gray-800 transition duration-200 ease-in-out"
                  >
                    Help Guide
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
