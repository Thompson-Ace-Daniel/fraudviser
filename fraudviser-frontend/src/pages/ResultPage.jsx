import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Clipboard,
  ExternalLink,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { date as formatDate, hasNumber, label, money as formatMoney } from "../utils/format.js";

const money = (value) => formatMoney(value, "NGN", "");
const date = (value) => formatDate(value, "");

const verdictStyles = {
  verify_first: "border-amber-200 bg-amber-50 text-amber-950",
  avoid_for_now: "border-rose-200 bg-rose-50 text-rose-950",
  proceed_with_checks: "border-emerald-200 bg-emerald-50 text-emerald-950",
  need_more_information: "border-slate-200 bg-slate-50 text-slate-900",
};

function verdictTitle(recommendation, isSeller) {
  const titles = {
    verify_first: isSeller ? "Clarify this before publishing" : "Verify before paying",
    avoid_for_now: isSeller ? "Pause before publishing" : "Avoid this for now",
    proceed_with_checks: isSeller ? "Ready to publish with checks" : "Proceed with normal checks",
    need_more_information: "More information is needed",
  };
  return titles[recommendation] || titles.need_more_information;
}

export default function ResultPage({ assessment, onBack, onNew, onRetry, retrying }) {
  const [copied, setCopied] = useState(false);
  const listing = assessment?.listing || {};
  const report = assessment?.report || null;
  const isSeller = assessment?.accountRole === "seller";
  const currentReport = Boolean(report?.recommendation && report?.opinion);
  const legacyReport = Boolean(report && !currentReport);
  const recommendation = report?.recommendation || "need_more_information";
  const marketReference = assessment?.marketEvidence?.source === "trusted_records" && assessment.marketEvidence.sourceCount >= 2
    ? assessment.marketEvidence
    : null;
  const reasons = (report?.reasons || []).filter(Boolean).slice(0, 3);
  const nextSteps = (report?.nextSteps || []).filter(Boolean).slice(0, 3);
  const missingInfo = (report?.missingInfo || []).filter(Boolean).slice(0, 3);
  const listingUrl = (() => {
    try {
      const url = new URL(listing.url);
      return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
    } catch {
      return "";
    }
  })();
  const searchUrl = listing.productName
    ? `https://www.google.com/search?q=${encodeURIComponent(listing.productName)}`
    : "";
  const copySummary = async () => {
    const summary = [
      listing.productName,
      hasNumber(listing.price) ? `Asking price: ${money(listing.price)}` : "",
      report?.opinion,
      ...nextSteps.map((step, index) => `${index + 1}. ${step}`),
    ].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl pb-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-white">
          <ArrowLeft size={16} /> History
        </button>
        {date(assessment?.createdAt) && <time className="text-xs text-slate-500">{date(assessment.createdAt)}</time>}
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-100 p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-700">{isSeller ? "Seller review" : "Buyer review"}</p>
              <h1 className="mt-2 break-words text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{listing.productName || "Listing review"}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.category && listing.category !== "Marketplace listing" && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{listing.category}</span>}
                {listing.condition && listing.condition !== "unspecified" && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-600">{label(listing.condition)}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {hasNumber(listing.price) && (
                <div className="shrink-0 rounded-2xl bg-slate-50 px-4 py-3 sm:min-w-44">
                  <p className="text-xs text-slate-500">Your asking price · not assessed</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{money(listing.price)}</p>
                </div>
              )}
              {marketReference && (
                <div className="shrink-0 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 sm:min-w-44">
                  <p className="text-xs text-emerald-800">Observed reference average</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-emerald-950">{money(marketReference.meanPrice)}</p>
                  <p className="mt-1 text-[11px] text-emerald-800">Range {money(marketReference.lowestPrice)}–{money(marketReference.highestPrice)}</p>
                  <p className="mt-1 text-[11px] text-emerald-800">{marketReference.sourceCount} independent {label(marketReference.condition)} records · past 90 days</p>
                  {hasNumber(marketReference.percentageDifference) && <p className="mt-1 text-[11px] font-semibold text-emerald-900">Your price is {Math.abs(marketReference.percentageDifference).toFixed(1)}% {marketReference.percentageDifference > 0 ? "above" : marketReference.percentageDifference < 0 ? "below" : "at"} this average</p>}
                </div>
              )}
            </div>
          </div>
        </header>

        {currentReport ? (
          <div className="p-5 sm:p-7">
            <section className={`rounded-2xl border p-5 sm:p-6 ${verdictStyles[recommendation] || verdictStyles.need_more_information}`} aria-labelledby="ai-opinion-title">
              <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.13em]"><Sparkles size={15} /> AI’s opinion</p>
              <h2 id="ai-opinion-title" className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{verdictTitle(recommendation, isSeller)}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7">{report.opinion}</p>
              <p className="mt-4 text-xs leading-5 opacity-75">This is an AI opinion based only on the details provided. It cannot confirm a seller’s identity or prove that a product is genuine or fake.</p>
            </section>

            {reasons.length > 0 && (
              <section className="mt-6">
                <h3 className="text-sm font-bold text-slate-900">What shaped this opinion</h3>
                <ul className="mt-3 space-y-2">
                  {reasons.map((reason, index) => <li key={`${reason}-${index}`} className="flex gap-2.5 text-sm leading-6 text-slate-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-700" />{reason}</li>)}
                </ul>
              </section>
            )}

            {listing.observations && <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600"><strong className="text-slate-800">Your note:</strong> {listing.observations}</p>}

            {nextSteps.length > 0 && (
              <section className="mt-6 rounded-2xl border border-slate-200 p-5">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Check size={17} className="text-emerald-700" />Your next steps</h3>
                <ol className="mt-3 space-y-3">
                  {nextSteps.map((step, index) => <li key={`${step}-${index}`} className="flex gap-3 text-sm leading-6 text-slate-700"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-800">{index + 1}</span>{step}</li>)}
                </ol>
              </section>
            )}

            {missingInfo.length > 0 && <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600"><strong className="text-slate-800">For a more useful opinion:</strong> {missingInfo.join(" · ")}</p>}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <div className="flex flex-wrap items-center gap-4">
                {listingUrl && <a href={listingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-950">Open listing <ExternalLink size={15} /></a>}
                {searchUrl && <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-950"><Search size={15} />Search similar listings</a>}
              </div>
              <button type="button" onClick={copySummary} className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Clipboard size={15} />{copied ? "Copied" : "Copy opinion"}</button>
            </div>
          </div>
        ) : legacyReport ? (
          <div className="m-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:m-7">
            <div className="flex gap-3"><CircleAlert size={19} className="mt-0.5 shrink-0 text-amber-800" /><div><h2 className="font-bold text-amber-950">This review uses the older format</h2><p className="mt-1 text-sm leading-6 text-amber-900">Create a fresh opinion to get the shorter buyer or seller recommendation. The asking price will not be assessed by AI.</p>{assessment.assessmentError && <p role="alert" className="mt-2 text-sm font-medium text-rose-800">{assessment.assessmentError}</p>}<button type="button" onClick={onRetry} disabled={retrying} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{retrying ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}{retrying ? "Updating opinion…" : "Create new opinion"}</button></div></div>
          </div>
        ) : (
          <div className="m-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:m-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><CircleAlert size={19} className="mt-0.5 shrink-0 text-amber-800" /><div><h2 className="font-bold text-amber-950">Your opinion isn’t ready</h2><p className="mt-1 text-sm leading-6 text-amber-900">{assessment?.assessmentError || "Your listing is saved. Try generating the opinion again."}</p></div></div><button type="button" onClick={onRetry} disabled={retrying} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{retrying ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}{retrying ? "Preparing…" : "Try again"}</button></div>
          </div>
        )}
      </section>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700"><ArrowLeft size={16} />History</button>
        <button type="button" onClick={onNew} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-900"><Plus size={16} />New review <ArrowRight size={15} /></button>
      </div>
    </div>
  );
}
