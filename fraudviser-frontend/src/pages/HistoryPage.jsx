import { Plus, Search } from "lucide-react";
import useWorkspace from "../hooks/useWorkspace.js";
import { PageHeading } from "../components/common/Headings.jsx";
import AssessmentTable, { AssessmentTableSkeleton } from "../components/assessments/AssessmentTable.jsx";

export default function HistoryPage() {
  const {
    filteredHistory,
    historyLoading,
    query,
    setQuery,
    showAssessment,
    startNew,
  } = useWorkspace();

  return (
    <>
      <PageHeading
        eyebrow="YOUR SAVED CHECKS"
        title="Assessment history"
        description="Review your recent product checks."
        action={
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            onClick={startNew}
          >
            <Plus size={16} /> New analysis
          </button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 focus-within:border-emerald-600 sm:max-w-md">
          <Search size={17} className="shrink-0 text-slate-400" />
          <span className="sr-only">Search assessments</span>
          <input
            className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm outline-none focus:ring-0"
            placeholder="Search your saved listings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <span className="text-sm text-slate-500">
          {filteredHistory.length} assessment
          {filteredHistory.length === 1 ? "" : "s"}
        </span>
      </div>

      {historyLoading ? (
        <AssessmentTableSkeleton />
      ) : (
        <AssessmentTable
          items={filteredHistory}
          onOpen={showAssessment}
          onNew={startNew}
        />
      )}
    </>
  );
}
