import Link from "next/link";

import { marketing } from "./site-config";

export default function SiteFooter() {
  return (
    <footer className="border-t border-black/[0.06] bg-white/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[13px] font-semibold text-gray-900">{marketing.productName}</p>
          <p className="mt-0.5 text-[13px] text-gray-500">{marketing.tagline}</p>
        </div>

        <div className="flex items-center gap-6 text-[13px]">
          <Link href="/" className="text-gray-500 hover:text-gray-900 transition-colors">
            Landing
          </Link>
          <Link href="/features" className="text-gray-500 hover:text-gray-900 transition-colors">
            Features
          </Link>
          <Link href="/login?next=%2Fapp" className="text-gray-500 hover:text-gray-900 transition-colors">
            Login
          </Link>
        </div>
      </div>
    </footer>
  );
}
