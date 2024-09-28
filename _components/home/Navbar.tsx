import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function Navbar() {
  return (
    <nav
      aria-label="navigation"
      className="flex w-full top-0 fixed justify-between items-center z-10 bg-bgD border-b-4 border-bgE"
    >
      <div className="flex container mx-auto px-6 py-3 md:flex-row md:justify-between md:items-center">
        <div className="flex justify-between items-center">
          <div>
            <Link className="text-white text-xl font-bold md:text-2xl" href="/">
              <Image
                width={291}
                height={90}
                src="/logo.png"
                alt="logo"
                className="w-[200px] h-[62px] sm:w-[291px] sm:h-[90px]"
                priority={true}
              />
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-4 mobile:ml-auto">
          <Link
            href="/"
            className="px-4 py-2 text-white text-sm font-semibold rounded-md bg-acc2 hover:bg-acc1 transition duration-200 ease-in-out"
          >
            Home
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 text-white text-sm font-semibold rounded-md bg-acc2 hover:bg-acc1 transition duration-200 ease-in-out"
          >
            Login
          </Link>
          <Link
            href="/contractor"
            className="px-4 py-2 text-white text-sm font-semibold rounded-md bg-acc2 hover:bg-acc1 transition duration-200 ease-in-out"
          >
            Registration
          </Link>
        </div>
      </div>
    </nav>
  );
}
