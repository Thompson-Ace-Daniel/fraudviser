export const getListing = (item) => item?.listing || item || {};

export const getAssessment = (item) =>
  item?.assessment || item?.result || item || {};

const CONCLUSION_LABELS = {
  no_specific_warning_observed: "No specific warning observed",
  some_signals_need_review: "Signals to review",
  substantial_signals_need_review: "Several signals to review",
  cannot_assess: "Insufficient evidence",
};

export const getAssessmentConclusion = (item) => {
  const result = getAssessment(item);
  return result?.report?.qualitativeConclusion || item?.report?.qualitativeConclusion;
};

export const getAssessmentLabel = (item) => {
  const conclusion = getAssessmentConclusion(item);
  if (CONCLUSION_LABELS[conclusion]) return CONCLUSION_LABELS[conclusion];
  const status = getAssessment(item)?.status;
  if (status === "ai_unavailable" || status === "ai_invalid")
    return "AI review pending";
  return "Older assessment";
};

export const getAssessmentStyle = (item) => {
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
