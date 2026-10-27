import { ArrowLeft, ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import useWorkspace from "../hooks/useWorkspace.js";
import { PageHeading } from "../components/common/Headings.jsx";

export default function AnalyzePage() {
  const { user } = useAuth();
  const { form, setForm, loading, handleAnalyze } = useWorkspace();
  const navigate = useNavigate();

  return (
    <>
      <PageHeading
        eyebrow="LISTING ANALYSIS"
        title="Get a clear next step"
        description={
          user?.role === "seller"
            ? "Get a clear AI opinion and practical steps to make the listing easier to trust."
            : "Get a clear AI opinion and practical steps before you pay."
        }
        action={
          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => navigate("/app")}
          >
            <ArrowLeft size={16} /> Dashboard
          </button>
        }
      />

      <form
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
        onSubmit={handleAnalyze}
      >
        <div className="mb-7 rounded-2xl bg-[#0d3c2e] p-5 text-white sm:p-6">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-emerald-200">
            <ShieldCheck size={16} /> Buyer & seller guide
          </span>
          <h2 className="mt-3 text-xl font-extrabold sm:text-2xl">
            Get a practical second opinion.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/80">
            Share the listing and any details that concern you. The AI returns
            a short recommendation and next steps. Your asking price is saved
            for your reference and is not assessed by AI.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(240px,.42fr)]">
          <label className="block min-w-0 text-sm font-bold text-slate-800">
            What is being offered?
            <textarea
              required
              minLength={5}
              maxLength={1200}
              rows={5}
              value={form.productName}
              onChange={(event) =>
                setForm({ ...form, productName: event.target.value })
              }
              className="mt-2 block min-h-36 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-normal leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
              placeholder="e.g. Used dining table in good condition; seller asks for a deposit before viewing. Or: 2-bedroom apartment with a 1-year rent request."
            />
            <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">
              Any product, service, rental, or deal is welcome. Include the condition and terms when you know them.
            </span>
          </label>

          <label className="block min-w-0 text-sm font-bold text-slate-800">
            Listing link <span className="font-normal text-slate-400">(optional)</span>
            <input
              type="url"
              maxLength={2000}
              value={form.listingUrl}
              onChange={(event) => setForm({ ...form, listingUrl: event.target.value })}
              className="mt-2 block min-h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
              placeholder="https://…"
            />
          </label>

          <label className="block min-w-0 text-sm font-bold text-slate-800">
            What concerns you? <span className="font-normal text-slate-400">(optional)</span>
            <textarea
              maxLength={1500}
              rows={2}
              value={form.observations}
              onChange={(event) => setForm({ ...form, observations: event.target.value })}
              className="mt-2 block min-h-14 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-normal leading-6 text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
              placeholder="For example: seller wants a deposit before I can see the item."
            />
          </label>

          <label className="block min-w-0 text-sm font-bold text-slate-800">
            Asking price <span className="font-normal text-slate-400">(optional)</span>
            <span className="mt-2 flex min-h-14 overflow-hidden rounded-2xl border border-slate-300 transition focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-600/10">
              <span className="flex items-center border-r border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-500">
                ₦
              </span>
              <input
                className="min-w-0 flex-1 border-0 px-3 text-base font-semibold tabular-nums outline-none focus:ring-0"
                type="number"
                min="1"
                max="1000000000"
                step="1"
                inputMode="numeric"
                placeholder="Enter if known"
                value={form.price}
                onChange={(event) =>
                  setForm({ ...form, price: event.target.value })
                }
              />
            </span>
            <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">
              Saved for your reference only. The AI never sees or evaluates it.
            </span>
          </label>

          <label className="block min-w-0 text-sm font-bold text-slate-800">
            Condition <span className="font-normal text-slate-400">(optional)</span>
            <select
              value={form.condition}
              onChange={(event) => setForm({ ...form, condition: event.target.value })}
              className="mt-2 block min-h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
            >
              <option value="unspecified">Not specified</option>
              <option value="new">New</option>
              <option value="used">Used</option>
              <option value="refurbished">Refurbished</option>
              <option value="open_box">Open box</option>
              <option value="near_expiry">Near expiry</option>
              <option value="service">Service</option>
            </select>
            <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">
              A reference average appears only when trusted records match the exact name and condition.
            </span>
          </label>
        </div>

        {loading && (
          <div
            className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"
            role="status"
            aria-live="polite"
          >
            <LoaderCircle
              size={19}
              className="mt-0.5 animate-spin text-emerald-700"
            />
            <div>
              <p className="text-sm font-bold text-emerald-950">
                Preparing your AI opinion
              </p>
              <p className="mt-1 text-xs leading-5 text-emerald-800">
                The AI opinion is prepared separately from any available market reference.
              </p>
            </div>
          </div>
        )}

        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="min-h-11 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => navigate("/app")}
          >
            <ArrowLeft size={16} className="mr-2 inline" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-70"
          >
            {loading ? (
              "Building your analysis…"
            ) : (
              <>
                Analyse and get advice <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
}
