import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import WorkspaceContext from "./workspace-context.js";
import useAuth from "../hooks/useAuth.js";
import { assessmentIdOf } from "../utils/assessment.js";

const DRAFT_KEY = "fraudviser-draft";

const blankForm = { productName: "", price: "" };

function loadDraft() {
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
    return {
      ...blankForm,
      productName: draft.productName || "",
      price: draft.price || "",
    };
  } catch {
    return { ...blankForm };
  }
}

export function WorkspaceProvider({ children }) {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [form, setForm] = useState(loadDraft);
  const [loading, setLoading] = useState(false);
  const [retryingAssessment, setRetryingAssessment] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const historyResponse = await api.get("/analysis");
      setHistory(
        Array.isArray(historyResponse?.data?.items)
          ? historyResponse.data.items
          : [],
      );
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(refresh);
  }, [refresh]);

  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  const showAssessment = useCallback(
    (item) => {
      setError("");
      const id = assessmentIdOf(item);
      if (id) navigate(`/analysis/${id}`);
      else setAssessment(item);
    },
    [navigate],
  );

  const handleAnalyze = useCallback(
    async (event) => {
      event?.preventDefault?.();
      setLoading(true);
      setError("");
      try {
        const response = await api.post("/analysis", {
          productName: form.productName.trim(),
          description: form.productName.trim(),
          category: "Marketplace listing",
          condition: "unspecified",
          price: Number(form.price),
          currency: "NGN",
        });
        setAssessment(response.data);
        navigate(`/analysis/${response.data._id || response.data.id}`);
        sessionStorage.removeItem(DRAFT_KEY);
        await refresh();
      } catch (err) {
        setError(
          err.response?.status >= 500
            ? "We couldn’t complete this analysis right now. Please try again shortly."
            : err.response?.data?.error ||
                "We couldn’t complete this analysis. Please check the details and try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [form, navigate, refresh],
  );

  const startNew = useCallback(() => {
    setForm({ ...blankForm });
    sessionStorage.removeItem(DRAFT_KEY);
    setError("");
    navigate("/analyze");
  }, [navigate]);

  const signOut = useCallback(async () => {
    try {
      await api.post("/auth/logout");
      setUser(null);
      navigate("/", { replace: true });
    } catch {
      setError(
        "We couldn’t end your session right now. Please try signing out again.",
      );
    }
  }, [navigate, setUser]);

  const retryAssessment = useCallback(async () => {
    const id = assessmentIdOf(assessment);
    if (!id) return;
    setRetryingAssessment(true);
    setError("");
    try {
      const { data } = await api.post(`/analysis/${id}/retry`);
      setAssessment(data);
      await refresh();
    } catch (err) {
      if (err.response?.data?.assessment)
        setAssessment(err.response.data.assessment);
      setError(
        err.response?.data?.error ||
          "The assessment could not be retried. Your saved evidence is still available.",
      );
    } finally {
      setRetryingAssessment(false);
    }
  }, [assessment, refresh]);

  const submitAssessmentFeedback = useCallback(
    async (payload) => {
      const id = assessmentIdOf(assessment);
      if (!id) throw new Error("This assessment has no saved ID.");
      return api.post(`/analysis/${id}/feedback`, payload);
    },
    [assessment],
  );

  const filteredHistory = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return history;
    return history.filter((item) => {
      const listing = item?.listing || {};
      return `${listing.productName || ""} ${listing.model || ""} ${
        listing.marketplace || ""
      }`
        .toLowerCase()
        .includes(needle);
    });
  }, [history, query]);

  const value = useMemo(
    () => ({
      history,
      historyLoading,
      assessment,
      setAssessment,
      form,
      setForm,
      loading,
      retryingAssessment,
      error,
      setError,
      query,
      setQuery,
      filteredHistory,
      refresh,
      showAssessment,
      handleAnalyze,
      startNew,
      signOut,
      retryAssessment,
      submitAssessmentFeedback,
    }),
    [
      history,
      historyLoading,
      assessment,
      form,
      loading,
      retryingAssessment,
      error,
      query,
      filteredHistory,
      refresh,
      showAssessment,
      handleAnalyze,
      startNew,
      signOut,
      retryAssessment,
      submitAssessmentFeedback,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
