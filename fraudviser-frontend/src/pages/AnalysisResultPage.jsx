import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios.js";
import useWorkspace from "../hooks/useWorkspace.js";
import { assessmentIdOf } from "../utils/assessment.js";
import ResultPage from "./ResultPage.jsx";

export default function AnalysisResultPage() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const {
    assessment,
    setAssessment,
    setError,
    startNew,
    retryAssessment,
    retryingAssessment,
    submitAssessmentFeedback,
  } = useWorkspace();
  const [fetchFailedFor, setFetchFailedFor] = useState(null);

  const cached =
    assessmentIdOf(assessment) === String(assessmentId) ? assessment : null;

  useEffect(() => {
    if (cached) return;
    let active = true;
    api
      .get(`/analysis/${assessmentId}`)
      .then(({ data }) => {
        if (active) {
          setAssessment(data);
          setError("");
          setFetchFailedFor(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err.response?.data?.error || "Could not load this assessment.",
          );
          setFetchFailedFor(String(assessmentId));
        }
      });
    return () => {
      active = false;
    };
  }, [assessmentId, cached, setAssessment, setError]);

  if (!cached && fetchFailedFor !== String(assessmentId)) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600"
      >
        Loading saved assessment…
      </div>
    );
  }

  if (!cached) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600"
      >
        This assessment could not be found. It may have been removed, or the
        link is incomplete.
      </div>
    );
  }

  return (
    <ResultPage
      assessment={cached}
      onBack={() => navigate("/history")}
      onNew={startNew}
      onRetry={retryAssessment}
      retrying={retryingAssessment}
      onFeedback={submitAssessmentFeedback}
    />
  );
}
