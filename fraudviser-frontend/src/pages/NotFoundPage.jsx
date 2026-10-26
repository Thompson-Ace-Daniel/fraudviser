import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f8f4] px-5 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-800 text-white">
          <ShieldCheck size={26} />
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
          Page not found
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          This page doesn&apos;t exist
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          The link you followed may be broken, or the page may have moved. Head
          back to continue checking listings.
        </p>
        <Link
          to="/"
          className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-900"
        >
          <ArrowLeft size={16} /> Back to home
        </Link>
      </div>
    </main>
  );
}
