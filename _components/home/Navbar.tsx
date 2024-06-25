import Link from "next/link";
import React from "react";

export default function Navbar() {
  return (
    <nav
      aria-label="navigation"
      className="flex w-full top-0 fixed justify-between items-center p-2 bg z-10"
    >
      <div className="container mx-auto px-6 py-3 md:flex md:justify-between md:items-center">
        <div className="flex justify-between items-center">
          <div>
            <Link className="text-white text-xl font-bold md:text-2xl" href="/">
              Roofs Local
            </Link>
          </div>

          <div className="flex md:hidden">
            <Link
              href="/"
              className="px-3 py-2 text-white text-sm font-semibold rounded-md hover:bg-acc2 hover:text-gray-800 dark:hover:text-white"
            >
              Home
            </Link>
            <Link
              href="/login"
              className="px-3 py-2 text-white text-sm font-semibold rounded-md hover:bg-acc2 hover:text-gray-800 dark:hover:text-white"
            >
              Contractor Login
            </Link>
            <Link
              href="/contractor"
              className="px-3 py-2 text-white text-sm font-semibold rounded-md hover:bg-acc2 hover:text-gray-800 dark:hover:text-white"
            >
              Register as a Contractor
            </Link>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-1">
          <Link
            href="/"
            className="px-3 py-2 text-white text-sm font-semibold rounded-md hover:bg-acc2 hover:text-gray-800 dark:hover:text-white"
          >
            Home
          </Link>
          <Link
            href="/contractor"
            className="px-3 py-2 text-white text-sm font-semibold rounded-md hover:bg-acc2 hover:text-gray-800 dark:hover:text-white"
          >
            Buy Leads
          </Link>
        </div>
      </div>
    </nav>
  );
}
