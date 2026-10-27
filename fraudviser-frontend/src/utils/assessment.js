export const getListing = (item) => item?.listing || item || {};

export const getAssessment = (item) =>
  item?.assessment || item?.result || item || {};

const CONCLUSION_LABELS = {
  no_specific_warning_observed: "No specific warning observed",
  some_signals_need_review: "Signals to review",
  substantial_signals_need_review: "Several signals to review",
  cannot_assess: "Insufficient evidence",
};

const RECOMMENDATION_LABELS = {
  verify_first: "Verify before deciding",
  avoid_for_now: "Avoid for now",
  proceed_with_checks: "Proceed with checks",
  need_more_information: "More details needed",
};

export const getAssessmentConclusion = (item) => {
  const result = getAssessment(item);
  return result?.report?.qualitativeConclusion || item?.report?.qualitativeConclusion;
};

export const getAssessmentLabel = (item) => {
  const report = getAssessment(item)?.report || item?.report;
  if (RECOMMENDATION_LABELS[report?.recommendation])
    return RECOMMENDATION_LABELS[report.recommendation];
  const conclusion = getAssessmentConclusion(item);
  if (CONCLUSION_LABELS[conclusion]) return CONCLUSION_LABELS[conclusion];
  const status = getAssessment(item)?.status;
  if (status === "ai_unavailable" || status === "ai_invalid")
    return "AI review pending";
  return "Older assessment";
};

export const getAssessmentStyle = (item) => {
  const report = getAssessment(item)?.report || item?.report;
  if (report?.recommendation === "avoid_for_now")
    return "border-rose-200 bg-rose-50 text-rose-800";
  if (report?.recommendation === "verify_first")
    return "border-amber-200 bg-amber-50 text-amber-800";
  if (report?.recommendation === "proceed_with_checks")
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  const conclusion = getAssessmentConclusion(item);
  if (conclusion === "no_specific_warning_observed")
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (conclusion === "some_signals_need_review")
    return "border-amber-200 bg-amber-50 text-amber-800";
  if (conclusion === "substantial_signals_need_review")
    return "border-orange-200 bg-orange-50 text-orange-800";
  return "border-slate-200 bg-slate-100 text-slate-600";
};

export const assessmentIdOf = (item) =>
  typeof item === "string" ? item : (item?._id || item?.id || null);
