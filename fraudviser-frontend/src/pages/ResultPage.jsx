import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ExternalLink,
  Check,
  CircleAlert,
  CircleHelp,
  History,
  Lightbulb,
  MessageCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";

const money = (value) => {
  const amount = Number(value);
  return value == null || value === "" || !Number.isFinite(amount)
    ? "—"
    : new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
};
const date = (value) => {
  const parsed = new Date(value);
  return !value || Number.isNaN(parsed.getTime()) ? "Date not supplied" : parsed.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
};
const textOf = (item) => typeof item === "string" ? item : item?.description || item?.message || item?.title || item?.explanation || "";
const readable = (value) => typeof value === "string" ? value.replaceAll("_", " ") : "";
const sourceTypeLabel = (type) => ({ demo: "illustrative reference", imported: "market observation", cached: "saved observation", live: "market provider" }[type] || "market observation");

function Badge({ level }) {
  const value = String(level || "Insufficient information").toLowerCase();
  const tone = value.includes("elevated") || value.includes("high") ? "border-red-200 bg-red-50 text-red-700" : value.includes("moderate") || value.includes("medium") ? "border-amber-200 bg-amber-50 text-amber-800" : value.includes("low") ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-100 text-slate-700";
  return <span className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${tone}`}><span className="h-2 w-2 shrink-0 rounded-full bg-current" />{level || "Insufficient information"}</span>;
}

function SectionTitle({ icon: Icon, eyebrow, title, detail }) {
  return <div className="mb-5 flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={19} /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">{eyebrow}</p><h2 className="mt-1 break-words text-lg font-bold tracking-tight text-slate-950">{title}</h2>{detail && <p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p>}</div></div>;
}

function PriceChart({ listingPrice, median, low, high }) {
  const maximum = Math.max(Number(listingPrice) || 0, Number(high) || 0, Number(median) || 0, 1);
  const chartHeight = 138;
  const barHeight = (value) => Math.max(2, ((Number(value) || 0) / maximum) * chartHeight);
  const y = (value) => 162 - barHeight(value);
  const compact = (value) => new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
  const grid = [0, 0.25, 0.5, 0.75, 1];
  return <div className="mt-4 w-full min-w-0 overflow-hidden rounded-2xl bg-slate-50 p-3 sm:p-5">
    <svg viewBox="0 0 600 205" role="img" aria-label={`Price comparison: listing ${money(listingPrice)}, market median ${money(median)}`} className="h-auto w-full">
      {grid.map((fraction) => { const yLine = 162 - fraction * chartHeight; return <g key={fraction}><line x1="66" y1={yLine} x2="578" y2={yLine} stroke="#e2e8f0" strokeDasharray={fraction === 0 ? "0" : "4 5"} /><text x="56" y={yLine + 4} textAnchor="end" fill="#94a3b8" fontSize="10">{compact(maximum * fraction)}</text></g>; })}
      <text x="176" y="190" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="600">Your listing</text>
      <text x="392" y="190" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="600">Market median</text>
      <rect x="124" y={y(listingPrice)} width="104" height={barHeight(listingPrice)} rx="8" fill="#d69b44" />
      <rect x="340" y={y(median)} width="104" height={barHeight(median)} rx="8" fill="#16815c" />
      <text x="176" y={Math.max(15, y(listingPrice) - 8)} textAnchor="middle" fill="#475569" fontSize="10" fontWeight="700">{compact(listingPrice)}</text>
      <text x="392" y={Math.max(15, y(median) - 8)} textAnchor="middle" fill="#475569" fontSize="10" fontWeight="700">{compact(median)}</text>
      <text x="524" y="40" textAnchor="middle" fill="#94a3b8" fontSize="9">Observed range</text>
      <line x1="524" x2="524" y1={y(high)} y2={y(low)} stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
      <circle cx="524" cy={y(high)} r="4" fill="#64748b" /><circle cx="524" cy={y(low)} r="4" fill="#64748b" />
      <text x="524" y={Math.max(14, y(high) - 9)} textAnchor="middle" fill="#64748b" fontSize="9">{compact(high)}</text>
      <text x="524" y={Math.min(178, y(low) + 16)} textAnchor="middle" fill="#64748b" fontSize="9">{compact(low)}</text>
    </svg>
    <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>Listing price compared with the median of matching records</span><span>₦ values shown in chart scale</span></div>
  </div>;
}

function ResultPage({ assessment, onBack, onNew }) {
  const result = assessment?.assessment || assessment?.result || assessment || {};
  const isSeller = (assessment?.accountRole || result.accountRole) === "seller";
  const listing = result.listing || assessment?.listing || {};
  const price = result.priceAnalysis || assessment?.priceAnalysis || {};
  const conditionRanges = Array.isArray(price.conditionRanges) ? price.conditionRanges : [];
  const risk = typeof result.risk === "object" ? result.risk : assessment?.risk || {};
  const ai = result.aiAssessment || assessment?.aiAssessment || {};
  const riskLevel = result.riskLevel || risk.level || assessment?.riskLevel || "Insufficient information";
  const scoreValue = risk.score ?? result.score ?? result.riskScore;
  const score = Number.isFinite(Number(scoreValue)) ? Math.max(0, Math.min(100, Number(scoreValue))) : null;
  const deviation = Number(price.signedDeviationPct);
  const observations = Array.isArray(price.observations) ? price.observations : [];
  const factors = Array.isArray(risk.factors) ? risk.factors : Array.isArray(risk.signals) ? risk.signals : [];
  const missing = Array.isArray(risk.missingInformation) ? risk.missingInformation : [];
  const recommendations = Array.isArray(risk.recommendations) ? risk.recommendations : [];
  const aiWarnings = Array.isArray(ai.warningSigns) ? ai.warningSigns : [];
  const aiAdvice = Array.isArray(ai.safetyAdvice) ? ai.safetyAdvice : [];
  const aiQuestions = Array.isArray(ai.questionsForSeller) ? ai.questionsForSeller : [];
  const aiPositive = Array.isArray(ai.positiveSignals) ? ai.positiveSignals : [];
  const sources = [...new Set(observations.map((item) => item.sourceType).filter(Boolean))];
  const summary = ai.summary || risk.summary || price.interpretation || "We reviewed the details supplied and the comparable records available for this item.";
  const scoreColor = score >= 50 ? "#b74e42" : score >= 25 ? "#bd8525" : "#16815c";
  const levelText = deviation <= -35 ? "Below the observed median" : deviation >= 35 ? "Above the observed median" : price.available ? "Near the observed median" : "No market comparison";
  const brandKey = String(listing.brand || "").toLowerCase();
  const officialSources = brandKey.includes("apple") ? [{ label: "Apple Authorized Reseller locator", url: "https://locate.apple.com/ng/en/sales/?pt=all" }, { label: "Apple Nigeria · where to buy", url: "https://www.apple.com/ng/buy/" }]
    : brandKey.includes("samsung") ? [{ label: "Samsung Africa official site", url: "https://www.samsung.com/africa_en/" }, { label: "Samsung support and local seller guidance", url: "https://www.samsung.com/africa_en/support/" }]
      : brandKey.includes("hp") || brandKey.includes("hewlett") ? [{ label: "HP Nigeria · find a retailer", url: "https://www.hp.com/ng-en/contact-hp/shopping.html" }, { label: "HP Nigeria official site", url: "https://www.hp.com/ng-en/home.html" }]
        : [];

  return <div className="mx-auto w-full max-w-6xl min-w-0 pb-8">
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <button type="button" onClick={onBack} className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-white"><ArrowLeft size={16} />All assessments</button>
      <span className="text-xs text-slate-500">Assessment from {date(result.createdAt || result.assessedAt)}</span>
    </div>

    <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><ShieldCheck size={24} /></span><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">{listing.productType === "service" ? "SERVICE REVIEW" : "LISTING REVIEW"} · {listing.category || "LISTING"}</p><h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{listing.productName || "Listing analysis"}</h1><p className="mt-2 break-words text-sm text-slate-500">{[listing.brand, listing.model, listing.storage].filter(Boolean).join(" · ") || "No extra product details supplied"}{listing.condition ? ` · ${readable(listing.condition)}` : ""}</p></div></div>
        <Badge level={riskLevel} />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
        <div className="min-w-0 rounded-2xl bg-slate-50 p-4"><span className="text-xs font-medium text-slate-500">Asking price</span><strong className="mt-1 block break-words text-xl font-bold text-slate-950">{money(listing.price)}</strong></div>
        <div className="min-w-0 rounded-2xl bg-slate-50 p-4"><span className="text-xs font-medium text-slate-500">Comparable median</span><strong className="mt-1 block break-words text-xl font-bold text-slate-950">{price.available ? money(price.referencePrice) : "Not available"}</strong></div>
        <div className="min-w-0 rounded-2xl bg-slate-50 p-4"><span className="text-xs font-medium text-slate-500">Price difference</span><strong className="mt-1 flex items-center gap-1 break-words text-xl font-bold text-slate-950">{price.available ? <>{deviation < 0 ? <ArrowDownRight size={19} className="text-amber-600" /> : deviation > 0 ? <ArrowUpRight size={19} className="text-slate-500" /> : null}{deviation > 0 ? "+" : ""}{deviation.toFixed(1)}%</> : "No estimate"}</strong></div>
      </div>
    </section>

    <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <SectionTitle icon={BarChart3} eyebrow="CONDITION GUIDE" title="Market price ranges by condition" detail="Ranges come from matching product records. Compare like with like; prices vary by specifications, location and time." />
      {conditionRanges.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{conditionRanges.map((item) => <article key={item.condition} className={`rounded-2xl border p-4 ${item.condition === listing.condition ? "border-emerald-300 bg-emerald-50/50" : "border-slate-100 bg-slate-50/70"}`}><div className="flex items-center justify-between gap-2"><strong className="text-sm capitalize text-slate-900">{item.label || readable(item.condition)}</strong>{item.condition === listing.condition && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">Selected</span>}</div><div className="mt-4 grid grid-cols-3 gap-2"><div><span className="text-[10px] text-slate-500">Low</span><strong className="mt-1 block break-words text-xs text-slate-900 sm:text-sm">{money(item.low)}</strong></div><div><span className="text-[10px] text-slate-500">Median</span><strong className="mt-1 block break-words text-xs text-slate-900 sm:text-sm">{money(item.median)}</strong></div><div><span className="text-[10px] text-slate-500">High</span><strong className="mt-1 block break-words text-xs text-slate-900 sm:text-sm">{money(item.high)}</strong></div></div><p className="mt-3 text-[11px] text-slate-500">Based on {item.count} {item.count === 1 ? "record" : "records"}</p></article>)}</div> : <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">There are no comparable observations across conditions yet. The report uses available information without estimating unsupported prices.</p>}
      {ai.conditionPriceContext && <p className="mt-4 rounded-xl border-l-4 border-emerald-500 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">{ai.conditionPriceContext}</p>}
    </section>

    <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,.8fr)]">
      <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <SectionTitle icon={BarChart3} eyebrow="PRICE CHECK" title="How the asking price compares" detail={price.method || "We use the median of comparable records when enough matching information is available."} />
        {price.available ? <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4"><div><span className="text-xs text-slate-500">Price position</span><strong className="mt-1 block text-sm font-bold text-slate-900">{levelText}</strong></div><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${price.confidence === "low" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>{price.count} matching {price.count === 1 ? "record" : "records"} · {price.confidence || "limited"} confidence</span></div>
          <PriceChart listingPrice={listing.price} median={price.referencePrice} low={price.lowestPrice} high={price.highestPrice} />
          {price.interpretation && <p className="mt-4 rounded-xl border-l-4 border-emerald-500 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">{price.interpretation}</p>}
          {!!observations.length && <details className="group mt-4 rounded-2xl border border-slate-200"><summary className="cursor-pointer list-none p-4 text-sm font-semibold text-slate-800">View the {observations.length} comparable records <span className="float-right text-emerald-700 group-open:rotate-180">⌄</span></summary><div className="max-h-64 overflow-auto border-t border-slate-100">{observations.map((item, index) => <div key={`${item.source}-${item.retrievedAt}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><span className="min-w-0 break-words text-xs text-slate-600">{item.source || "Source not supplied"}<small className="mt-1 block text-slate-400">{readable(item.sourceType)} · {date(item.observedAt || item.retrievedAt)}</small></span><strong className="text-sm text-slate-900">{money(item.price)}</strong></div>)}</div></details>}
          {sources.length > 0 && <p className="mt-3 text-xs text-slate-400">Reference types: {sources.map(sourceTypeLabel).join(", ")}. These records are not independently verified by this assessment.</p>}
        </> : <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><CircleAlert size={18} className="mt-0.5 shrink-0" /><p><strong className="block">No comparable price estimate</strong>We could not find a matching record for this item and its key details. The asking price is shown without an invented benchmark. You can still use the risk review and buyer advice below.</p></div>}
      </section>

      <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <SectionTitle icon={ShieldCheck} eyebrow="OBSERVABLE SIGNALS" title="Risk and confidence" detail="A rule-based signal score, not a probability of fraud." />
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-slate-50 p-4">
          {score !== null && <div className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${scoreColor} ${score * 3.6}deg, #e2e8f0 0deg)` }}><div className="grid h-[60px] w-[60px] place-items-center rounded-full bg-white"><span className="text-center"><strong className="block text-xl leading-5 text-slate-900">{score}</strong><small className="text-[9px] text-slate-500">/100</small></span></div></div>}
          <div className="min-w-0 flex-1"><Badge level={riskLevel} /><p className="mt-2 text-xs font-semibold text-slate-600">Evidence coverage: {risk.evidenceCoverage || (price.available ? "Some information missing" : "Limited information")}</p><p className="mt-1 text-xs leading-5 text-slate-500">{risk.disclaimer || "The score reflects only signals visible in the information provided."}</p></div>
        </div>
        <div className="mt-5 space-y-3">
          {factors.length ? factors.map((factor, index) => <div key={`${factor.title || factor.name || "signal"}-${index}`} className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-100 p-3"><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${factor.severity === "elevated" ? "bg-red-50 text-red-700" : factor.weight > 0 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}><CircleAlert size={15} /></span><div className="min-w-0 flex-1"><strong className="block break-words text-sm text-slate-800">{factor.title || factor.name || "Observed signal"}</strong><p className="mt-1 break-words text-xs leading-5 text-slate-500">{factor.explanation || factor.description || factor.message || "No additional detail supplied."}</p></div>{Number.isFinite(Number(factor.weight)) && <span className="shrink-0 text-xs font-semibold text-slate-400">{factor.weight > 0 ? `+${factor.weight}` : "Info"}</span>}</div>) : <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">No warning rule was triggered from the details supplied. This does not verify the seller.</p>}
        </div>
        {!!missing.length && <div className="mt-5 rounded-2xl border border-slate-200 p-4"><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><CircleHelp size={16} className="text-slate-500" />What would improve this assessment?</h3><ul className="mt-3 space-y-2">{missing.map((item) => <li key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-600"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />{item}</li>)}</ul></div>}
      </section>
    </div>

    <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <SectionTitle icon={Sparkles} eyebrow="PERSONALIZED REVIEW" title={isSeller ? "What buyers may want to verify" : "What to know before paying"} detail="Advice is based only on the submitted listing and the records available to Fraudviser." />
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="min-w-0 rounded-2xl bg-slate-50 p-4 sm:p-5"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Lightbulb size={16} className="text-amber-600" />Assessment summary</h3><p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-slate-600">{summary}</p>{ai.priceContext && <p className="mt-3 border-t border-slate-200 pt-3 text-sm leading-6 text-slate-600">{ai.priceContext}</p>}</article>
        <article className="min-w-0 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 sm:p-5"><h3 className="flex items-center gap-2 text-sm font-bold text-emerald-950"><Check size={16} />Suggested next steps</h3>{ai.recommendedAction && <p className="mt-3 rounded-xl bg-white/80 p-3 text-sm font-semibold leading-6 text-emerald-950">{ai.recommendedAction}</p>}{(aiAdvice.length ? aiAdvice : recommendations).length ? <ul className="mt-3 space-y-3">{(aiAdvice.length ? aiAdvice : recommendations).map((item, index) => <li key={`${textOf(item)}-${index}`} className="flex min-w-0 items-start gap-2 text-sm leading-6 text-emerald-950"><Check size={15} className="mt-1 shrink-0 text-emerald-700" /><span className="break-words">{textOf(item)}</span></li>)}</ul> : <p className="mt-3 text-sm leading-6 text-emerald-900">Inspect the item in person, confirm its key details, and use a payment method with buyer protection.</p>}</article>
        {(aiWarnings.length > 0 || aiPositive.length > 0) && <article className="min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-5"><h3 className="text-sm font-bold text-slate-900">Signals mentioned in the review</h3><div className="mt-3 space-y-2">{aiWarnings.map((item, index) => <p key={`w-${index}`} className="flex items-start gap-2 text-sm leading-6 text-amber-900"><CircleAlert size={15} className="mt-1 shrink-0" />{textOf(item)}</p>)}{aiPositive.map((item, index) => <p key={`p-${index}`} className="flex items-start gap-2 text-sm leading-6 text-emerald-900"><Check size={15} className="mt-1 shrink-0" />{textOf(item)}</p>)}</div></article>}
        {(aiQuestions.length > 0 || !ai.available) && <article className="min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-5"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><MessageCircle size={16} className="text-slate-500" />{isSeller ? "Questions buyers may ask" : "Questions to ask the seller"}</h3>{aiQuestions.length ? <ul className="mt-3 space-y-2">{aiQuestions.map((item, index) => <li key={index} className="break-words text-sm leading-6 text-slate-600">{index + 1}. {textOf(item)}</li>)}</ul> : <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600"><li>Can you share a current photo or video of the exact item?</li><li>Can I inspect it and verify the details before payment?</li><li>What is included, and what payment protections are available?</li></ul>}</article>}
        {!!ai.listingImprovements?.length && <article className="min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-5"><h3 className="text-sm font-bold text-slate-900">Ways to strengthen this listing</h3><ul className="mt-3 space-y-2">{ai.listingImprovements.map((item, index) => <li key={index} className="flex items-start gap-2 text-sm leading-6 text-slate-600"><Check size={15} className="mt-1 shrink-0 text-emerald-700" />{textOf(item)}</li>)}</ul></article>}
      </div>
      {ai.limitations && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-600"><strong className="text-slate-800">Limits of this review: </strong>{ai.limitations}</p>}
      <p className="mt-4 text-xs leading-5 text-slate-400">{isSeller ? "This review cannot verify a buyer, seller identity, or guarantee a transaction. Keep claims accurate and share proof through safe channels." : "This review cannot verify a seller’s identity or guarantee that a listing is genuine. Confirm claims independently before sending money."}</p>
    </section>

    <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <SectionTitle icon={Store} eyebrow="BUY FROM A TRUSTED SOURCE" title="Official brand buying options" detail="Check the manufacturer's official site or reseller locator, confirm local warranty coverage, and verify the exact model before purchase." />
      {officialSources.length ? <div className="flex flex-wrap gap-3">{officialSources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-50">{source.label}<ExternalLink size={14} /></a>)}</div> : <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">Use the manufacturer’s official website to find its authorized sellers in Nigeria. Ask for an invoice and written warranty details, and confirm the seller directly with the brand before paying.</p>}
      {officialSources.length > 0 && <p className="mt-3 text-xs leading-5 text-slate-500">Availability and authorized sellers can change. Confirm the seller and Nigeria warranty with the manufacturer before you buy.</p>}
    </section>

    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
      <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><History size={16} />Assessment history</button>
      <button type="button" onClick={onNew} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"><Plus size={16} />Analyse another listing <ArrowRight size={15} /></button>
    </div>
  </div>;
}

export default ResultPage;
