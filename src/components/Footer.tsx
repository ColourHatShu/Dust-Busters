import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[#070b14] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-center text-sm text-slate-400">
        <div className="flex flex-wrap justify-center gap-8">
          <Link href="/" className="transition hover:text-emerald-400">
            Home
          </Link>
          <Link href="/about" className="transition hover:text-emerald-400">
            About
          </Link>
          <Link href="/book" className="transition hover:text-emerald-400">
            Book a cleaning
          </Link>
          <a
            href="mailto:support@dustbusters.ca"
            className="transition hover:text-emerald-400"
          >
            support@dustbusters.ca
          </a>
        </div>
        <p>
          &copy; {new Date().getFullYear()} Dust Busters &bull; Home cleaning in
          Courtenay, BC
        </p>
      </div>
    </footer>
  );
}
