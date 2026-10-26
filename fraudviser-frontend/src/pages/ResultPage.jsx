import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CircleAlert,
  Clipboard,
  ExternalLink,
  History,
  LoaderCircle,
  MessageSquareWarning,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  date as formatDate,
  hasNumber,
  label,
  money as formatMoney,
  referenceLabel,
} from "../utils/format.js";

const money = (value, currency = "NGN") => formatMoney(value, currency, "Not available");
const date = (value) => formatDate(value, "Date not supplied");

function Heading({ icon: Icon, eyebrow, title, description, dark = false }) {
  return <div className="mb-5 flex items-start gap-3">
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${dark ? "bg-white/10 text-white" : "bg-emerald-50 text-emerald-800"}`}><Icon size={19} /></span>
    <div className="min-w-0">
      <p className={`text-[10px] font-bold uppercase tracking-[.16em] ${dark ? "text-emerald-200" : "text-emerald-700"}`}>{eyebrow}</p>
      <h2 className={`mt-1 text-lg font-bold ${dark ? "text-white" : "text-slate-950"}`}>{title}</h2>
      {description && <p className={`mt-1 text-sm leading-6 ${dark ? "text-emerald-50/75" : "text-slate-500"}`}>{description}</p>}
    </div>
  </div>;
}

function PriceChart({ asking, sources, currency }) {
  const points = sources.filter((item) => hasNumber(item.price)).map((item) => Number(item.price));
  if (!hasNumber(asking) || points.length === 0) return null;

  const low = Math.min(...points);
  const high = Math.max(...points);
  const askingPrice = Number(asking);
  const padding = Math.max((high - low) * 0.22, Math.max(high, askingPrice, 1) * 0.08);
  const min = Math.max(0, Math.min(low, askingPrice) - padding);
  const max = Math.max(high, askingPrice) + padding;
  const x = (value) => 28 + ((value - min) / (max - min || 1)) * 584;
  const average = points.reduce((sum, value) => sum + value, 0) / points.length;

  return <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><p className="text-xs font-bold text-slate-900">Current source range</p><p className="mt-1 text-xs text-slate-500">Based on {points.length} matching {points.length === 1 ? "offer" : "offers"} found for this check</p></div>
      <strong className="text-sm tabular-nums text-slate-900">{money(low, currency)} – {money(high, currency)}</strong>
    </div>
    <svg viewBox="0 0 640 110" role="img" aria-label={`Asking price ${money(askingPrice, currency)}. Matching source prices range from ${money(low, currency)} to ${money(high, currency)}; average ${money(average, currency)}.`} className="mt-3 h-24 w-full overflow-visible">
      <line x1="28" y1="48" x2="612" y2="48" stroke="#cbd5e1" strokeWidth="8" strokeLinecap="round" />
      <line x1={x(low)} y1="48" x2={x(high)} y2="48" stroke="#059669" strokeWidth="8" strokeLinecap="round" />
      {points.map((price, index) => <circle key={`${price}-${index}`} cx={x(price)} cy="48" r="7" fill="#047857" stroke="white" strokeWidth="3"><title>{money(price, currency)}</title></circle>)}
      <line x1={x(askingPrice)} y1="22" x2={x(askingPrice)} y2="76" stroke="#b45309" strokeWidth="3" strokeDasharray="5 4" />
      <path d={`M ${x(askingPrice) - 6} 16 L ${x(askingPrice) + 6} 16 L ${x(askingPrice)} 25 Z`} fill="#b45309" />
      <text x="28" y="91" fill="#64748b" fontSize="11" textAnchor="start">{money(low, currency)}</text>
      <text x="612" y="91" fill="#64748b" fontSize="11" textAnchor="end">{money(high, currency)}</text>
    </svg>
    <div className="flex flex-wrap gap-4 text-[11px] text-slate-600"><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-700" />Found offers</span><span className="inline-flex items-center gap-1.5"><i className="h-3 w-0.5 bg-amber-700" />Asking price</span><span className="ml-auto text-slate-500">Average {money(average, currency)}</span></div>
  </div>;
}

function SourceCard({ item, index, currency }) {
  let safeUrl = null;
  try { const parsed = new URL(item.sourceUrl); if (parsed.protocol === "https:") safeUrl = parsed.toString(); } catch { /* Keep unverified links unavailable. */ }
  return <article id={`market-source-${index}`} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-emerald-700">{item.source || item.sourceDomain || "Marketplace"}</p><h3 className="mt-1 break-words text-sm font-bold leading-5 text-slate-900">{item.title || item.productName || "Matching offer"}</h3></div>
      <strong className="shrink-0 text-sm font-bold tabular-nums text-slate-950">{money(item.price, currency)}</strong>
    </div>
    <p className="mt-3 text-xs leading-5 text-slate-500">{[item.brand, item.model, item.storage, label(item.condition), item.seller].filter(Boolean).join(" · ") || "Offer details were not fully provided"}</p>
    <p className="mt-1 text-[11px] text-slate-400">{item.country || "Nigeria"} · {item.currency || currency} · checked {date(item.retrievedAt)}</p>
    {item.promotional && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs leading-5 text-amber-900">Promotion shown. Confirm the final amount and terms at checkout.</p>}
    {safeUrl ? <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100">View source offer <ExternalLink size={14} /></a> : <p className="mt-3 text-xs text-amber-800">A verified source link is unavailable.</p>}
  </article>;
}

const FEEDBACK_TOPICS = [
  ["analysis", "AI analysis"],
  ["pricing", "Price comparison"],
  ["source_match", "Matched sources"],
  ["missing_information", "Missing information"],
  ["other", "Something else"],
];

function FeedbackForm({ onFeedback }) {
  const [category, setCategory] = useState("analysis");
  const [message, setMessage] = useState("");
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault(); setState("sending"); setError("");
    try { await onFeedback({ category, message }); setState("sent"); setMessage(""); }
    catch (err) { setState("idle"); setError(err.response?.data?.error || "Feedback could not be sent. Please try again."); }
  };
  return <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[200px_1fr_auto] sm:items-end">
    <label className="text-xs font-semibold text-slate-700">Topic<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800">{FEEDBACK_TOPICS.map(([value, topic]) => <option key={value} value={value}>{topic}</option>)}</select></label>
    <label className="text-xs font-semibold text-slate-700">What should we review?<textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={8} maxLength={2000} required rows={2} className="mt-2 min-h-12 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal" placeholder="Tell us what looks inaccurate or missing." /></label>
    <button disabled={state === "sending" || state === "sent"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{state === "sending" ? <LoaderCircle size={15} className="animate-spin" /> : state === "sent" ? <Check size={15} /> : <MessageSquareWarning size={15} />}{state === "sent" ? "Received" : "Send feedback"}</button>
    {error && <p role="alert" className="text-xs text-red-700 sm:col-span-3">{error}</p>}
    {state === "sent" && <p role="status" className="text-xs text-emerald-800 sm:col-span-3">Thanks. Your feedback is attached to this assessment.</p>}
  </form>;
}

export default function ResultPage({ assessment, onBack, onNew, onRetry, retrying, onFeedback }) {
  const [copied, setCopied] = useState(false);
  const listing = assessment?.listing || {};
  const report = assessment?.report || null;
  const legacy = !report && !["ai_unavailable", "ai_invalid"].includes(assessment?.status);
  const validation = report?.priceValidation || {
    status: assessment?.marketEvidence?.status || "unavailable",
    currency: assessment?.marketEvidence?.currency || "NGN",
    askingPrice: listing.price,
    meanMarketPrice: assessment?.marketEvidence?.meanPrice ?? null,
    differenceAmount: assessment?.marketEvidence?.differenceAmount ?? null,
    percentageDifference: assessment?.marketEvidence?.percentageDifference ?? null,
    validIndependentSourceCount: assessment?.marketEvidence?.usableSourceCount || 0,
    requiredSourceCount: assessment?.marketEvidence?.requiredSourceCount || 3,
    sources: assessment?.marketEvidence?.observations || [],
    conditionRanges: assessment?.marketEvidence?.conditionRanges || [],
    excludedSources: assessment?.marketEvidence?.excluded || [],
    sourceAttempts: assessment?.marketEvidence?.attempts || [],
  };
  const isSeller = assessment?.accountRole === "seller";
  const complete = validation.status === "complete";
  const count = validation.validIndependentSourceCount || 0;
  const difference = validation.differenceAmount;
  const percentage = validation.percentageDifference;
  const differenceLabel = hasNumber(difference) ? `${Number(difference) > 0 ? "+" : ""}${money(difference, validation.currency)}` : "Not available";
  const summaryText = [
    `${listing.productName || "Listing analysis"} — ${money(listing.price, listing.currency || "NGN")}`,
    report?.overallConclusion,
    report?.priceExplanation,
    ...((report?.suggestedNextSteps || []).slice(0, 3).map((step, index) => `${index + 1}. ${step}`)),
  ].filter(Boolean).join("\n");
  const sourceStatus = useMemo(() => ({ matched: "Matching offer found", searched: "Search completed", no_comparable_offer: "No matching offer", no_results: "No results", unavailable: "Marketplace search unavailable", error: "Marketplace search unavailable", no_grounding: "Could not verify source link", insufficient_details: "Need more product details" }), []);
  const copySummary = async () => {
    try { await navigator.clipboard.writeText(summaryText); setCopied(true); window.setTimeout(() => setCopied(false), 2200); } catch { setCopied(false); }
  };

  return <div className="mx-auto w-full max-w-6xl min-w-0 pb-8">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={onBack} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-white"><ArrowLeft size={16} />Assessment history</button><span className="text-xs text-slate-500">Checked {date(assessment?.createdAt || report?.generatedAt)}</span></div>

    <section className="mb-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-[#0d3c2e] p-5 text-white sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10"><ShieldCheck size={24} /></span><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.15em] text-emerald-200">{isSeller ? "SELLER ANALYTICS" : "BUYER ANALYTICS"} · {listing.category || "MARKETPLACE LISTING"}</p><h1 className="mt-2 break-words text-2xl font-extrabold tracking-tight sm:text-3xl">{listing.productName || "Listing analysis"}</h1><p className="mt-2 break-words text-sm text-emerald-50/75">{[listing.brand, listing.model, listing.storage, label(listing.condition)].filter(Boolean).join(" · ") || listing.description}</p></div></div>
          <span className={`w-fit shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${assessment?.status === "completed" ? "bg-emerald-200 text-emerald-950" : "bg-amber-100 text-amber-950"}`}>{legacy ? "Older report" : assessment?.status === "completed" ? "AI report ready" : "AI report pending"}</span>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/10 p-4"><span className="text-xs text-emerald-100/75">Your asking price</span><strong className="mt-1 block break-words text-2xl font-extrabold tabular-nums">{money(listing.price, listing.currency || "NGN")}</strong></div>
          <div className="rounded-2xl bg-white/10 p-4"><span className="text-xs text-emerald-100/75">Observed market average</span><strong className="mt-1 block break-words text-2xl font-extrabold tabular-nums">{money(validation.meanMarketPrice, validation.currency)}</strong></div>
          <div className="rounded-2xl bg-white/10 p-4"><span className="text-xs text-emerald-100/75">Compared with observed average</span><strong className="mt-1 flex flex-wrap items-center gap-1 text-2xl font-extrabold tabular-nums">{hasNumber(percentage) ? <>{Number(percentage) < 0 ? <ArrowDownRight size={20} /> : Number(percentage) > 0 ? <ArrowUpRight size={20} /> : null}{Number(percentage) > 0 ? "+" : ""}{Number(percentage).toFixed(1)}%</> : "—"}</strong><span className="mt-1 block text-xs text-emerald-100/70">{differenceLabel} difference</span></div>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"><p className="text-sm font-semibold text-slate-700">{count ? `${count} current matching ${count === 1 ? "offer" : "offers"} · ${complete ? "three-source market check" : "provisional market check"}` : "No verified market comparison for this listing"}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={copySummary} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Clipboard size={15} />{copied ? "Copied" : "Copy summary"}</button><button type="button" onClick={onNew} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-900"><Plus size={15} />New analysis</button></div></div>
    </section>

    {legacy && <div role="status" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">This older assessment does not include the current AI report or verifiable marketplace evidence. Start a new analysis for an updated review.</div>}

    {assessment?.status !== "completed" && !legacy && <section className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-extrabold text-amber-950">AI advice is not ready yet</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-amber-900">{assessment?.assessmentError || "Your listing and source search are saved. Retry when the AI service is available."}</p></div><button type="button" onClick={onRetry} disabled={retrying} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{retrying ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}{retrying ? "Retrying…" : "Generate AI advice"}</button></div></section>}

    {report && <>
      <section className="mb-5 rounded-3xl border border-emerald-900 bg-[#0d3c2e] p-5 text-white shadow-sm sm:p-7"><Heading icon={Sparkles} eyebrow="AI DECISION BRIEF" title={report.overallConclusion || "What to do next"} description="Advice generated from your listing details and the verified evidence shown below." dark /><div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><div><p className="text-sm leading-7 text-emerald-50">{report.listingSummary}</p><div className="mt-5 rounded-2xl border border-white/15 bg-white/5 p-4"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-emerald-200">Price interpretation</p><p className="mt-1 text-base font-bold">{label(report.priceAssessment)}</p><p className="mt-2 text-sm leading-6 text-emerald-50/80">{report.priceExplanation}</p></div></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-emerald-200">Recommended next actions</p><ol className="mt-3 space-y-3">{(report.suggestedNextSteps || []).slice(0, 4).map((item, index) => <li key={`${item}-${index}`} className="flex gap-3 text-sm leading-6 text-white"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15 text-xs font-bold">{index + 1}</span>{item}</li>)}</ol></div></div><div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-4 text-xs leading-5 text-emerald-50/75">{report.evidenceCoverage} {report.riskExplanation}</div></section>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><Heading icon={Check} eyebrow="YOUR ACTION PLAN" title={isSeller ? "Make this listing easier to trust" : "Before you pay"} description="Practical steps from the AI review." /><ul className="space-y-3">{(report.safetyRecommendations || []).map((item, index) => <li key={`${item}-${index}`} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700"><Check size={16} className="mt-1 shrink-0 text-emerald-700" />{item}</li>)}</ul>{!!report.verificationActions?.length && <><h3 className="mt-5 text-sm font-bold text-slate-900">Verification checklist</h3><ul className="mt-3 space-y-2">{report.verificationActions.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2 text-sm leading-6 text-slate-600"><ArrowRight size={15} className="mt-1 shrink-0 text-emerald-700" />{item}</li>)}</ul></>}</section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><Heading icon={MessageSquareWarning} eyebrow="CONVERSATION GUIDE" title={isSeller ? "Help buyers verify your listing" : "Ask the seller"} description="Questions tailored to the information available." /><ul className="space-y-3">{(report.questionsForSeller || []).map((item, index) => <li key={`${item}-${index}`} className="flex gap-3 text-sm leading-6 text-slate-700"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-800">{index + 1}</span>{item}</li>)}</ul></section>
      </div>
    </>}

    <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><Heading icon={BarChart3} eyebrow="LIVE PRICE RESEARCH" title="Compare the market" description={report?.priceExplanation || "Only current, source-linked Nigerian offers that match the product details are used in the direct comparison."} />
      {legacy ? <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">No traceable marketplace observations are attached to this older report.</p> : <>
        <div className={`mb-4 rounded-2xl border p-4 ${complete ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><strong className="text-sm text-slate-900">{complete ? "Three independent offers found" : count ? `${count} of ${validation.requiredSourceCount} independent offers found` : "A comparable price could not be verified"}</strong><p className="mt-1 text-xs leading-5 text-slate-600">{report?.evidenceCoverage || "No market price has been estimated without a matching, verifiable offer."}</p></div>
        <PriceChart asking={validation.askingPrice} sources={validation.sources || []} currency={validation.currency} />
        {!!validation.conditionRanges?.length && <div className="mt-5"><h3 className="text-sm font-bold text-slate-900">Recent verified prices by condition</h3><p className="mt-1 text-xs leading-5 text-slate-500">Additional exact-match Nigeria offers retrieved within the last 90 days.</p><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{validation.conditionRanges.map((range) => <article key={range.condition} className="rounded-2xl border border-slate-200 p-4"><strong className="text-sm capitalize text-slate-900">{range.label || label(range.condition)}</strong><div className="mt-3 grid grid-cols-3 gap-2">{[["Low", range.lowestPrice], ["Average", range.meanPrice], ["High", range.highestPrice]].map(([title, value]) => <div key={title}><span className="text-[10px] text-slate-500">{title}</span><strong className="mt-1 block text-xs tabular-nums text-slate-800">{money(value, range.currency || validation.currency)}</strong></div>)}</div><p className="mt-3 text-[10px] text-slate-500">{range.count} independent {range.count === 1 ? "source" : "sources"}</p></article>)}</div></div>}
        {!!validation.sources?.length && <div className="mt-5 grid min-w-0 gap-3 md:grid-cols-2">{validation.sources.map((item, index) => <SourceCard key={`${item.sourceDomain}-${item.referenceId || index}`} item={item} index={index} currency={validation.currency} />)}</div>}
        {!validation.sources?.length && <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">No source returned a verified offer for this exact item. Include the model, size or capacity, and condition in the listing details to improve matching.</p>}
        {!!validation.sourceAttempts?.length && <details className="group mt-5 rounded-2xl border border-slate-200"><summary className="cursor-pointer p-4 text-sm font-bold text-slate-800">Research coverage ({validation.sourceAttempts.length} marketplaces)</summary><div className="grid gap-2 border-t border-slate-100 p-4 sm:grid-cols-3">{validation.sourceAttempts.map((attempt) => <div key={attempt.domain || attempt.source} className="rounded-xl bg-slate-50 p-3"><strong className="block text-xs text-slate-800">{attempt.source}</strong><span className="mt-1 block text-xs text-slate-500">{sourceStatus[attempt.status] || "Search status unavailable"}</span></div>)}</div></details>}
        {!!validation.excludedSources?.length && <details className="group mt-3 rounded-2xl border border-slate-200"><summary className="cursor-pointer p-4 text-sm font-bold text-slate-800">Why other results were left out ({validation.excludedSources.length})</summary><div className="border-t border-slate-100">{validation.excludedSources.map((item, index) => <div key={`${item.sourceUrl}-${index}`} className="border-b border-slate-100 p-4 last:border-0"><strong className="text-xs text-slate-800">{item.title || item.source}</strong><ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-600">{(item.reasons || []).map((reason) => <li key={reason}>{reason}</li>)}</ul></div>)}</div></details>}
        <p className="mt-4 text-xs leading-5 text-slate-400">Marketplace prices and stock can change. Confirm the exact variant, condition, delivery charges, and final checkout price at the source.</p>
      </>}
    </section>

    {!!report?.supportedFindings?.length && <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><Heading icon={ShieldCheck} eyebrow="EVIDENCE NOTES" title="What the review used" description="AI observations link to the listing details or a source offer." /><div className="space-y-3">{report.supportedFindings.map((finding, index) => <article key={`${finding.message}-${index}`} className="rounded-xl border border-slate-100 p-4"><p className="text-sm leading-6 text-slate-800">{finding.message}</p><div className="mt-2 flex flex-wrap gap-2">{finding.evidenceRefs.map((reference) => { const match = /^market\.sources:(\d+)$/.exec(reference); return match ? <a key={reference} href={`#market-source-${match[1]}`} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-900">{referenceLabel(reference)}</a> : <span key={reference} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{referenceLabel(reference)}</span>; })}</div></article>)}</div></section>}

    {report && <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><Heading icon={CircleAlert} eyebrow="LIMITS & OPEN QUESTIONS" title="What still needs checking" /><div className="grid gap-5 sm:grid-cols-2"><div><h3 className="text-sm font-bold text-slate-900">Information still needed</h3>{report.missingInformation?.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">{report.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-slate-600">No additional details were identified for this review.</p>}</div><div><h3 className="text-sm font-bold text-slate-900">What this review cannot confirm</h3>{report.limitations?.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">{report.limitations.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-slate-600">No additional limitations were returned.</p>}</div></div></section>}

    <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><Heading icon={MessageSquareWarning} eyebrow="FEEDBACK" title="Improve this assessment" description="Tell us if a source or AI recommendation looks inaccurate." />{onFeedback ? <FeedbackForm onFeedback={onFeedback} /> : <p className="text-sm text-slate-500">Feedback submission is unavailable.</p>}</section>

    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onBack} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700"><History size={16} />Assessment history</button><button type="button" onClick={onNew} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white"><Plus size={16} />Analyse another listing <ArrowRight size={15} /></button></div>
  </div>;
}
