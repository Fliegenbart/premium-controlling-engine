import Link from "next/link";

import { marketing } from "./site-config";

export default function SiteFooter() {
  return (
    <footer className="border-t border-black/10 bg-white/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{marketing.productName}</p>
          <p className="mt-1 text-sm text-gray-600">{marketing.tagline}</p>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
            Landing
          </Link>
          <Link href="/features" className="text-gray-600 hover:text-gray-900 transition-colors">
            Features
          </Link>
          <Link href="/login?next=%2Fapp" className="text-gray-600 hover:text-gray-900 transition-colors">
            Login
          </Link>
        </div>
      </div>
    </footer>
  );
}

