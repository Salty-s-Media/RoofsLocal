'use client';

import Link from 'next/link';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function Home() {
  return (
    <>
      <div
        className={`flex min-h-screen w-full justify-center bg-blk flex-col ${inter.className}`}
      >
        <div className="relative justify-center items-center flex flex-col w-full">
          <div className="flex flex-row justify-between items-center gap-x-4">
            <Link
              href="/contractor"
              className="px-5 py-3 text-white text-sm font-semibold rounded-md bg-acc2 hover:bg-acc1 transition duration-200 ease-in-out"
            >
              Register
            </Link>
            <Link
              href="/login"
              className="px-5 py-3 text-white text-sm font-semibold rounded-md bg-bgE hover:bg-bgD transition duration-200 ease-in-out"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
