import { ArrowLeft, BarChart3, Check, CircleAlert, Database, History, Plus, ShieldCheck } from "lucide-react";

const money = (value) => value == null || value === "" || !Number.isFinite(Number(value)) ? "—" : new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(value));
const date = (value) => { const parsed = new Date(value); return !value || Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }); };
const getListing = (item) => item?.listing || item || {};
const getAssessment = (item) => item?.assessment || item?.result || item || {};
const getRiskLevel = (item) => { const result = getAssessment(item); return result.riskLevel || result.risk?.level || item?.riskLevel || "Insufficient information"; };
const getRiskStyle = (level = "") => { const value = String(level).toLowerCase(); if (value.includes("elevated") || value.includes("high")) return { style: "border-red-200 bg-red-50 text-red-700", dot: "bg-red-500" }; if (value.includes("moderate") || value.includes("medium")) return { style: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" }; if (value.includes("low")) return { style: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" }; return { style: "border-slate-200 bg-slate-100 text-slate-600", dot: "bg-slate-400" }; };
function PageHeading({ eyebrow, title, description, action }) { return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="text-xs font-bold tracking-[0.15em] text-emerald-700">{eyebrow}</div><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">{description}</p></div>{action}</div>; }
function RiskBadge({ level }) { const risk = getRiskStyle(level); return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${risk.style}`}><span className={`h-2 w-2 rounded-full ${risk.dot}`} />{level}</span>; }
function ResultPage({ assessment, onBack, onNew }) {
  const listing = getListing(assessment);
  const result = getAssessment(assessment);
  const risk = result.risk || {};
  const priceAnalysis = result.priceAnalysis || {};
  const level = getRiskLevel(assessment);

  const summary =
    risk.summary || result.summary ||
    result.explanation ||
    result.recommendation ||
    priceAnalysis.interpretation || risk.disclaimer ||
    "Review the available information carefully before making a purchase.";

  const signals = risk.factors || result.signals || result.riskFactors || result.reasons || [];

  const signalList = Array.isArray(signals)
    ? signals
    : Object.entries(signals).map(([key, value]) => ({
        title: key,
        description:
          typeof value === "string" ? value : JSON.stringify(value),
      }));

  const score =
    risk.score ?? result.score ?? result.riskScore ?? result.assessmentScore ?? null;

  const scoreNumber =
    score !== null && Number.isFinite(Number(score))
      ? Number(score)
      : null;

  // Gemini AI assessment is read from the saved assessment.
  const ai = assessment?.aiAssessment || result.aiAssessment || {};

  const aiAvailable = ai.available === true;

  const aiSummary =
    ai.summary || ai.explanation || ai.assessment || "";

  const aiWarnings = Array.isArray(ai.warningSigns) ? ai.warningSigns : [];
  const aiAdvice = Array.isArray(ai.safetyAdvice) ? ai.safetyAdvice : [];
  const aiLimitations = ai.limitations || "";

  return (
    <>
      <PageHeading
        eyebrow="ASSESSMENT REPORT"
        title="Analysis report"
        description="Review the recorded details and signals for this listing."
        action={
          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onBack}
          >
            <ArrowLeft size={16} /> Back
          </button>
        }
      />

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck size={24} />
            </div>

            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-slate-500">
                LISTING ASSESSED
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-950 sm:text-2xl">
                {listing.productName || "Unnamed product"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {[listing.brand, listing.model, listing.storage]
                  .filter(Boolean)
                  .join(" · ") || "No additional specifications provided"}
              </p>
            </div>
          </div>

          <RiskBadge level={level} />
        </div>

        <div className="mt-7 grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3">
          <ResultDetail label="Asking price" value={money(listing.price)} />
          <ResultDetail
            label="Condition"
            value={listing.condition || "Not provided"}
          />
          <ResultDetail
            label="Marketplace"
            value={listing.marketplace || "Not provided"}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                Assessment findings
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Information returned by the analysis API
              </p>
            </div>
          </div>

          {scoreNumber !== null && (
            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-600">
                  Reported assessment score
                </span>
                <strong className="text-xl font-bold text-slate-900">
                  {scoreNumber}
                </strong>
              </div>
            </div>
          )}

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-slate-800">Summary</h4>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
              {summary}
            </p>
          </div>

          <div className="mt-7 border-t border-slate-100 pt-6">
            <h4 className="text-sm font-semibold text-slate-800">
              Signals and observations
            </h4>

            {signalList.length > 0 ? (
              <div className="mt-4 space-y-3">
                {signalList.map((signal, index) => {
                  const title =
                    typeof signal === "string"
                      ? `Observation ${index + 1}`
                      : signal.title ||
                        signal.name ||
                        signal.type ||
                        `Observation ${index + 1}`;

                  const description =
                    typeof signal === "string"
                      ? signal
                      : signal.description ||
                        signal.explanation ||
                        signal.message ||
                        signal.reason ||
                        signal.detail ||
                        "No further explanation provided.";

                  return (
                    <div
                      key={`${title}-${index}`}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 p-4"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <Check size={15} />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-sm font-semibold text-slate-800">
                          {title}
                        </h5>
                        <p className="mt-1 break-words text-sm leading-6 text-slate-600">
                          {description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                The API did not return a separate list of signals for this
                assessment. Check the summary and listing information above.
              </p>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Database size={19} />
              </div>
              <h3 className="font-semibold text-slate-900">
                Listing information
              </h3>
            </div>

            <div className="mt-5 space-y-4">
              <ResultDetail
                label="Seller"
                value={listing.seller || "Not provided"}
              />
              <ResultDetail
                label="Category"
                value={listing.category || "Not provided"}
              />
              <ResultDetail
                label="Assessment date"
                value={date(assessment.createdAt || assessment.assessedAt)}
              />

              {listing.url && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Listing URL
                  </span>
                  <a
                    href={listing.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block break-all text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
                  >
                    Open listing
                  </a>
                </div>
              )}
            </div>
          </section>

          {listing.description && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900">
                Seller description
              </h3>
              <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-slate-600">
                {listing.description}
              </p>
            </section>
          )}

          {listing.observations && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900">
                Your observations
              </h3>
              <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-slate-600">
                {listing.observations}
              </p>
            </section>
          )}
        </div>
      </div>

      {/* Gemini AI assessment */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <ShieldCheck size={22} />
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900">
              Gemini AI review
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Additional guidance based on the information supplied with this
              listing.
            </p>
          </div>

          <span
            className={`ml-auto shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              aiAvailable
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {aiAvailable ? "AI review available" : "AI review unavailable"}
          </span>
        </div>

        {aiAvailable ? (
          <div className="mt-6 space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">
                AI summary
              </h4>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
                {aiSummary || "No AI summary was returned."}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h4 className="text-sm font-semibold text-slate-800">
                Warning signs
              </h4>

              {aiWarnings.length ? (
                <ul className="mt-3 space-y-2">
                  {aiWarnings.map((warning, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
                    >
                      <CircleAlert size={17} className="mt-1 shrink-0" />
                      <span>
                        {typeof warning === "string"
                          ? warning
                          : warning.description ||
                            warning.message ||
                            warning.title ||
                            JSON.stringify(warning)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  No specific warning signs were returned. This does not prove
                  the listing or seller is safe.
                </p>
              )}
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h4 className="text-sm font-semibold text-slate-800">
                Safety advice
              </h4>

              {aiAdvice.length ? (
                <ul className="mt-3 space-y-3">
                  {aiAdvice.map((advice, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                        <Check size={14} />
                      </span>
                      <span className="text-sm leading-6 text-slate-600">
                        {typeof advice === "string"
                          ? advice
                          : advice.description ||
                            advice.message ||
                            advice.title ||
                            JSON.stringify(advice)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  No additional safety advice was returned.
                </p>
              )}
            </div>

            {aiLimitations && (
              <div className="rounded-xl bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-800">
                  Limitations
                </h4>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                  {aiLimitations}
                </p>
              </div>
            )}

            {ai.model && (
              <p className="text-xs text-slate-400">
                AI model: {ai.model}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-xl bg-amber-50 p-4">
            <p className="text-sm leading-6 text-amber-900">
              {ai.explanation ||
                ai.error ||
                "The AI review could not be generated for this assessment. The rule-based findings above are still available."}
            </p>
          </div>
        )}
      </section>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <CircleAlert size={18} className="mt-0.5 shrink-0" />
        <p>
          This report supports your decision; it does not prove that a seller
          is genuine or fraudulent. Verify the product, seller identity, and
          payment arrangements independently before paying.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={onBack}
        >
          <History size={16} /> Assessment history
        </button>

        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          onClick={onNew}
        >
          <Plus size={16} /> Analyse another listing
        </button>
      </div>
    </>
  );
}

function ResultDetail({ label, value }) {
  return (
    <div className="min-w-0">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="mt-1 block break-words text-sm font-semibold capitalize text-slate-800">
        {value || "Not provided"}
      </span>
    </div>
  );
}


export default ResultPage;
