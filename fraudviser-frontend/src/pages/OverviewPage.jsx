import { Activity, ArrowRight, CircleAlert, History, Plus, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import useWorkspace from "../hooks/useWorkspace.js";
import { SectionHeading, StatCard } from "../components/common/Headings.jsx";
import AssessmentTable, { AssessmentTableSkeleton } from "../components/assessments/AssessmentTable.jsx";

const dashboardDate = new Intl.DateTimeFormat("en-NG", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
})
  .format(new Date())
  .toUpperCase();

export default function OverviewPage() {
  const { user } = useAuth();
  const { history, historyLoading, showAssessment, startNew } = useWorkspace();
  const navigate = useNavigate();
  const isSeller = user?.role === "seller";
  const tips = isSeller
    ? [
        "Use clear photos of the exact item.",
        "State condition, included items and defects accurately.",
        "Share warranty and proof of ownership details when available.",
      ]
    : [
        "Inspect the exact item and confirm its condition.",
        "Check that the model, size and included items match the listing.",
        "Avoid deposits and use a payment method with buyer protection.",
      ];

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="text-xs font-bold tracking-[0.13em] text-slate-500">
            {dashboardDate} <span className="text-emerald-600">·</span> NIGERIA
          </div>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-emerald-950 sm:text-4xl lg:text-5xl">
            {isSeller
              ? "Price your next listing with context."
              : "Make your next purchase with confidence."}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            {isSeller
              ? "Compare your listing against available market offers and make its details easier for buyers to verify."
              : "Compare a listing with current market offers and get clear advice on what to check before you decide."}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 lg:self-auto"
          onClick={startNew}
        >
          <Plus size={17} />
          Analyse a listing
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="mb-7 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <ShieldCheck size={23} />
        </div>
        <div className="flex-1">
          <strong className="text-base font-semibold text-slate-900">
            A clearer way to shop online
          </strong>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Fraudviser compares product listings with recorded observations and
            explains the signals it can actually see.
          </p>
        </div>
        <span className="self-start rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold tracking-wide text-slate-600">
          DECISION SUPPORT
        </span>
      </div>

      <section className="mb-9 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={<History size={19} />}
          label={isSeller ? "Listings reviewed" : "Assessments made"}
          value={historyLoading ? "…" : history.length.toString()}
          note="Saved assessment history"
        />
        <StatCard
          icon={<Activity size={19} />}
          label="Account type"
          value={isSeller ? "Seller" : "Buyer"}
          note="Your workspace is private to your account"
        />
      </section>

      <SectionHeading
        title="Recent assessments"
        description="Your latest listing checks appear here."
        action={
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
            onClick={() => navigate("/history")}
          >
            View history <ArrowRight size={15} />
          </button>
        }
      />

      {historyLoading ? (
        <AssessmentTableSkeleton />
      ) : (
        <AssessmentTable
          items={history.slice(0, 5)}
          onOpen={showAssessment}
          onNew={startNew}
        />
      )}

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <ShieldCheck size={19} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              {isSeller ? "Build buyer confidence" : "A few checks before you pay"}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {isSeller
                ? "Clear details and verifiable claims help buyers make informed choices."
                : "Use the report as a starting point, then verify important claims yourself."}
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {tips.map((tip, index) => (
            <div key={tip} className="flex min-w-0 gap-3 rounded-xl bg-slate-50 p-4">
              <span className="text-xs font-bold text-emerald-700">
                0{index + 1}
              </span>
              <p className="text-sm leading-6 text-slate-600">{tip}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-4 flex flex-col gap-3 rounded-xl bg-slate-100 p-4 text-sm text-slate-600 sm:flex-row sm:items-center">
        <CircleAlert size={17} className="shrink-0 text-slate-500" />
        <span className="flex-1 leading-6">
          Price comparisons use current, source-linked offers when exact product
          details are available. If there is not enough evidence, the report says
          so.
        </span>
      </div>
    </>
  );
}
