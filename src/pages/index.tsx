'use client';

import Link from 'next/link';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function Home() {
  return (
    <div
      className={`relative flex min-h-screen w-full flex-col bg-blk overflow-hidden ${inter.className}`}
    >
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(161,246,34,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Hero */}
      <section className="relative z-[1] flex flex-1 flex-col items-center justify-center px-6 text-center pt-20">
        {/* Logo mark */}
        <div className="mb-8">
          <svg
            width="80"
            height="80"
            viewBox="0 0 152 181"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M88.1352 118.581C90.4199 117.216 91.5871 116.396 92.8536 115.8C111.007 107.431 121.586 89.874 119.624 71.348C117.538 51.853 104.054 37.052 84.3356 32.6316C58.7568 26.895 32.7558 47.482 32.3336 74.129C32.0604 92.233 32.2839 110.312 32.2591 128.416C32.2591 130.825 32.0604 133.258 31.9362 135.667L30.2227 136.586C25.5788 131.669 20.3885 127.149 16.3654 121.785C-0.89407 98.764 -4.86748 73.434 6.2084 46.837C17.2346 20.3389 37.5238 4.5197 66.1821 0.695299C111.529 -5.389 151.809 29.7261 151.759 75.395C151.759 95.039 144.856 112.448 131.321 126.926C126.876 131.694 122.282 136.362 117.489 140.758C116.272 141.876 113.093 142.869 112.398 142.198C104.302 134.674 96.504 126.801 88.1352 118.581Z"
              fill="white"
            />
            <path
              d="M52.7221 75.644C52.6228 62.358 62.8791 52.076 76.1156 52.126C89.054 52.201 99.261 62.407 99.261 75.271C99.261 88.607 89.0291 98.888 75.8424 98.839C62.9785 98.789 52.7966 88.582 52.6973 75.619L52.7221 75.644Z"
              fill="#CAFB81"
            />
            <path
              d="M54.2867 113.242C60.967 119.997 66.952 126.106 72.9866 132.165C80.3871 139.616 87.713 147.14 95.287 154.367C98.541 157.471 99.137 159.706 95.511 163.009C90.0722 167.951 84.9813 173.265 79.9152 178.555C77.0842 181.51 74.7746 181.336 72.0181 178.481C66.6291 172.893 60.967 167.579 55.6029 161.941C54.2619 160.526 52.896 158.39 52.8712 156.577C52.6725 143.142 52.7967 129.732 52.8712 116.297C52.8712 115.75 53.343 115.229 54.2619 113.217L54.2867 113.242Z"
              fill="#CAFB81"
            />
          </svg>
        </div>

        <h1 className="text-4xl font-extrabold text-white sm:text-5xl md:text-6xl leading-tight max-w-3xl">
          Get Roofing Leads{' '}
          <span className="text-acc1">in&nbsp;Your&nbsp;Area</span>
        </h1>

        <p className="mt-4 text-lg text-gray-400 max-w-xl sm:text-xl">
          Sign up to buy exclusive leads by ZIP code — only pay for the areas
          you want.
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/contractor"
            className="px-8 py-3.5 text-base font-semibold rounded-lg bg-acc2 text-white hover:bg-acc1 hover:text-black transition duration-200 ease-in-out"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 text-base font-semibold rounded-lg border-2 border-gray-500 text-white hover:border-white transition duration-200 ease-in-out"
          >
            Log In
          </Link>
        </div>

        {/* Feature highlights */}
        <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3 max-w-3xl w-full">
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl" role="img" aria-label="Target by ZIP code">
              📍
            </span>
            <h3 className="text-white font-semibold text-lg">
              Target by ZIP Code
            </h3>
            <p className="text-gray-400 text-sm">
              Choose exactly which areas you want to cover.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl" role="img" aria-label="Exclusive leads">
              ⚡
            </span>
            <h3 className="text-white font-semibold text-lg">
              Exclusive Local Leads
            </h3>
            <p className="text-gray-400 text-sm">
              No shared leads — each one goes to you and you alone.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl" role="img" aria-label="No contracts">
              💰
            </span>
            <h3 className="text-white font-semibold text-lg">
              No Long-Term Contracts
            </h3>
            <p className="text-gray-400 text-sm">
              Cancel anytime — pay only for what you use.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
