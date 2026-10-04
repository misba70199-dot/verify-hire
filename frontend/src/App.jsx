import { useEffect, useRef, useState } from "react";
import "./App.css";
import Report from "./Report.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const MAX_DESCRIPTION = 3000;
const REQUEST_TIMEOUT_MS = 90000;

// Visual stages only: the backend does not report per-step progress, so nothing here claims a step is done.
const LOADING_STEPS = [
  "Searching opportunity listings",
  "Checking official sources",
  "Checking reviews",
  "Checking risk signals",
  "Comparing submitted information with independent web evidence",
];

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function LoadingState({ step }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <p className="loading-title">
        <span className="spinner" aria-hidden="true" />
        Investigating this opportunity
      </p>
      <p className="loading-step">Gathering independent web evidence. This can take a little while.</p>
      <div className="loading-bar" aria-hidden="true">
        <span />
      </div>
      <ul className="loading-stages" aria-label="What Verify Hire is examining">
        {LOADING_STEPS.map((label, index) => (
          <li
            key={label}
            className={index === step ? "loading-stage loading-stage-active" : "loading-stage"}
            aria-current={index === step ? "step" : undefined}
          >
            <span className="loading-stage-dot" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
      <p className="loading-note">
        These steps show what is being examined, not live progress. Your report appears when the investigation finishes.
      </p>
    </div>
  );
}

function App() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const resultRef = useRef(null);

  // Rotate the progress message while the investigation runs
  useEffect(() => {
    if (!loading) return undefined;
    const timer = setInterval(() => {
      setStep((current) => (current + 1) % LOADING_STEPS.length);
    }, 2400);
    return () => clearInterval(timer);
  }, [loading]);

  // Bring the finished report into view
  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const verifyOpportunity = async (event) => {
    event.preventDefault();

    if (!company.trim() || !role.trim()) {
      setError("Please enter both company and role.");
      return;
    }
    if (jobUrl.trim() && !isHttpUrl(jobUrl.trim())) {
      setError("The job link must start with http:// or https://, or leave it empty.");
      return;
    }

    setLoading(true);
    setStep(0);
    setError("");
    setResult(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company: company.trim(),
          role: role.trim(),
          job_url: jobUrl.trim() || null,
          job_description: jobDescription.trim() || null,
        }),
        signal: controller.signal,
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok || !data || data.error) {
        throw new Error(
          (data && data.error) || `Server returned ${response.status}: ${response.statusText}`
        );
      }

      setResult(data);
    } catch (err) {
      let message;
      if (err?.name === "AbortError") {
        message = "The investigation took too long. Please try again.";
      } else if (err?.message && err.message !== "Failed to fetch") {
        message = err.message;
      } else {
        message = "Could not connect to the Verify Hire backend. Make sure FastAPI is running on port 8000.";
      }
      setError(message);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-inner">
          <div className="brand-row">
            <span className="logo" aria-hidden="true">VH</span>
            <span className="brand">Verify Hire</span>
          </div>
          <p className="hero-badge">
            <span className="hero-dot" aria-hidden="true" />
            AI-Powered Opportunity Verification
          </p>
          <h1>
            Verify the opportunity <span className="hero-accent">before you trust it.</span>
          </h1>
          <p className="hero-sub">
            Check an internship or job against live web evidence. See what can be confirmed, what could not be,
            and what to double-check before you proceed.
          </p>
          <ul className="hero-points">
            <li>Independent web evidence</li>
            <li>Your claims kept separate from facts</li>
            <li>Clear next steps</li>
          </ul>
        </div>
      </header>

      <main className="container">
        <form className="form-card" onSubmit={verifyOpportunity} noValidate>
          <div className="form-head">
            <h2>Investigate an opportunity</h2>
            <p>Company and role are required. The link and message are optional and sharpen the comparison.</p>
          </div>

          <div className="field field-half">
            <label htmlFor="company">
              <span>Company</span>
              <span className="tag tag-required">Required</span>
            </label>
            <input
              id="company"
              type="text"
              placeholder="e.g. Microsoft"
              value={company}
              maxLength={150}
              onChange={(e) => setCompany(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="field field-half">
            <label htmlFor="role">
              <span>Role / Opportunity</span>
              <span className="tag tag-required">Required</span>
            </label>
            <input
              id="role"
              type="text"
              placeholder="e.g. Python Developer Internship"
              value={role}
              maxLength={200}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="field">
            <label htmlFor="jobUrl">
              <span>Job / Opportunity Link</span>
              <span className="tag">Optional</span>
            </label>
            <input
              id="jobUrl"
              type="url"
              placeholder="e.g. https://careers.company.com/job/123"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="field">
            <label htmlFor="jobDescription">
              <span>Job Description or Recruitment Message</span>
              <span className="tag">Optional</span>
            </label>
            <textarea
              id="jobDescription"
              placeholder="Paste the job posting, interview invite, or message you received (LinkedIn, WhatsApp, email…)"
              rows={5}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              maxLength={MAX_DESCRIPTION}
              disabled={loading}
            />
            <p className="counter">
              {jobDescription.length}/{MAX_DESCRIPTION}
            </p>
          </div>

          <p className="form-note">
            What you enter is used for comparison and is <strong>not treated as verified</strong>. Verify Hire checks it
            against independent web evidence.
          </p>
          <p className="privacy-hint">
            Tip: To protect your privacy, avoid pasting sensitive personal details like bank accounts, passwords, or
            government IDs.
          </p>

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner spinner-light" aria-hidden="true" />
                Investigating…
              </>
            ) : (
              "Verify Opportunity →"
            )}
          </button>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>

        {loading && <LoadingState step={step} />}

        {result && (
          <div className="report-wrap" ref={resultRef}>
            <div className="report-header">
              <p className="eyebrow">Report for</p>
              <h2>
                {result.role} <span className="at">at</span> {result.company}
              </h2>
            </div>
            <Report result={result} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
