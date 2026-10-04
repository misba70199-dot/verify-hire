import { useState } from "react";

/* ---------- display configuration ---------- */

const VERDICTS = {
  Verified: { tone: "verified", icon: "✓" },
  "Partially Verified": { tone: "partial", icon: "◐" },
  "Needs Verification": { tone: "needs", icon: "?" },
  "Strong Warning": { tone: "strong", icon: "⚠" },
};

// Trust scale shown under the verdict, from least to most trusted
const SCALE = ["Strong Warning", "Needs Verification", "Partially Verified", "Verified"];

const FINDINGS = {
  confirmed: { tone: "verified", icon: "✓", label: "Confirmed" },
  unconfirmed: { tone: "neutral", icon: "?", label: "Unconfirmed" },
  warning: { tone: "needs", icon: "⚠", label: "Warning" },
};

const MATCHES = {
  match: { tone: "verified", icon: "✓", label: "Match" },
  mismatch: { tone: "strong", icon: "✕", label: "Mismatch" },
  unverified: { tone: "neutral", icon: "?", label: "Unverified" },
};

const CATEGORIES = [
  { key: "opportunity", label: "Opportunity", hint: "Listings that mention this role at this company." },
  { key: "official", label: "Official", hint: "Company website and careers-page results." },
  { key: "reviews", label: "Reviews", hint: "Employee and applicant reviews." },
  {
    key: "red_flags",
    label: "Red Flags",
    hint: "Results from searches for scam or fraud reports. Matching words alone do not mean fraud.",
  },
];

const DISCLAIMER =
  "Verify Hire provides evidence-based research, not a guarantee. Always confirm important details directly with the organization before applying or sharing sensitive information.";

/* ---------- small helpers (defensive: the UI must never crash on missing fields) ---------- */

const arr = (value) => (Array.isArray(value) ? value : []);
const str = (value) => (typeof value === "string" ? value : "");

function safeHref(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

function normalizeReport(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    verdict: VERDICTS[raw.verdict] ? raw.verdict : "Needs Verification",
    verdictReason: str(raw.verdict_reason),
    verdictAdjusted: Boolean(raw.verdict_adjusted),
    aiAvailable: raw.ai_available !== false,
    findings: arr(raw.quick_findings).filter((f) => f && str(f.text)),
    matches: arr(raw.match_mismatch).filter((m) => m && str(m.item)),
    redFlags: arr(raw.red_flags).map(str).filter(Boolean),
    steps: arr(raw.recommended_steps).map(str).filter(Boolean),
    limitations: arr(raw.limitations).map(str).filter(Boolean),
    coverage: raw.coverage && typeof raw.coverage === "object" ? raw.coverage : {},
  };
}

function Badge({ tone, icon, children }) {
  return (
    <span className={`badge badge-${tone}`}>
      <span aria-hidden="true">{icon}</span>
      {children}
    </span>
  );
}

function Cites({ ids }) {
  const list = arr(ids);
  if (list.length === 0) return null;
  return (
    <span className="cites">
      {list.map((id) => (
        <a key={id} className="cite" href={`#source-${id}`} title={`Jump to source ${id}`}>
          {id}
        </a>
      ))}
    </span>
  );
}

function SectionTitle({ children, note }) {
  return (
    <div className="r-title">
      <h2>{children}</h2>
      {note && <p>{note}</p>}
    </div>
  );
}

/* ---------- 1. verification result ---------- */

function VerdictCard({ report, result }) {
  const config = VERDICTS[report.verdict];
  const when = result.generated_at ? new Date(result.generated_at) : null;
  const whenText = when && !Number.isNaN(when.getTime()) ? when.toLocaleString() : null;

  return (
    <section className={`verdict verdict-${config.tone}`} aria-labelledby="verdict-heading">
      <div className="verdict-main">
        <span className="verdict-icon" aria-hidden="true">{config.icon}</span>
        <div className="verdict-body">
          <p className="eyebrow" id="verdict-heading">Verification result</p>
          <p className="verdict-label">{report.verdict}</p>
          <p className="verdict-reason">{report.verdictReason}</p>
        </div>
      </div>

      <ol className="scale" aria-label="Trust scale, from strong warning to verified">
        {SCALE.map((name) => (
          <li key={name} className={name === report.verdict ? "scale-step scale-active" : "scale-step"}
              aria-current={name === report.verdict ? "true" : undefined}>
            <span className="scale-bar" aria-hidden="true" />
            <span className="scale-name">{name}</span>
          </li>
        ))}
      </ol>

      <p className="verdict-meta">
        {report.verdictAdjusted && "Verdict adjusted to match the available evidence. "}
        {result.cached && "Showing a recent saved result. "}
        {whenText && `Generated ${whenText}.`}
      </p>

      {report.limitations.length > 0 && (
        <div className="limits">
          <p className="limits-title">What could not be verified</p>
          <ul>
            {report.limitations.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ---------- 2. quick summary ---------- */

function QuickSummary({ findings }) {
  if (findings.length === 0) return null;
  return (
    <section className="r-section">
      <SectionTitle>Quick summary</SectionTitle>
      <ul className="finding-list">
        {findings.map((finding, index) => {
          const config = FINDINGS[finding.type] || FINDINGS.unconfirmed;
          return (
            <li className={`finding finding-${config.tone}`} key={index}>
              <Badge tone={config.tone} icon={config.icon}>{config.label}</Badge>
              <span className="finding-text">
                {finding.text}
                <Cites ids={finding.source_ids} />
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------- 3. user-provided information ---------- */

function UserProvided({ user, urlDetails }) {
  const [expanded, setExpanded] = useState(false);
  const description = str(user.job_description);
  const long = description.length > 320;
  const redirected =
    urlDetails && urlDetails.final_domain && urlDetails.domain && urlDetails.final_domain !== urlDetails.domain;

  return (
    <section className="r-section">
      <SectionTitle>User-provided information</SectionTitle>
      <div className="panel">
        <p className="panel-banner">
          <span aria-hidden="true">ⓘ</span> Submitted by you — not independently verified. It is used for comparison only.
        </p>
        <dl className="facts">
          <div>
            <dt>Company</dt>
            <dd>{user.company}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{user.role}</dd>
          </div>
          {user.job_url && (
            <div className="facts-wide">
              <dt>Submitted link</dt>
              {/* Shown as plain text on purpose: never make a possibly-fraudulent link one click away. */}
              <dd className="mono-text">{user.job_url}</dd>
            </div>
          )}
          {urlDetails && (
            <div className="facts-wide">
              <dt>What we could see at the link</dt>
              <dd>
                {urlDetails.title ? `Page title: “${urlDetails.title}”. ` : ""}
                {redirected ? `The link redirects to ${urlDetails.final_domain}. ` : ""}
                {urlDetails.note}
              </dd>
            </div>
          )}
          {description && (
            <div className="facts-wide">
              <dt>Job description / recruitment message</dt>
              <dd className={`message ${long && !expanded ? "message-clamped" : ""}`}>{description}</dd>
              {long && (
                <button type="button" className="link-button" onClick={() => setExpanded((v) => !v)}>
                  {expanded ? "Show less" : "Show full message"}
                </button>
              )}
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}

/* ---------- 4. web evidence ---------- */

function WebEvidence({ evidence, coverage, searchErrors }) {
  const [active, setActive] = useState(CATEGORIES[0].key);
  const current = CATEGORIES.find((c) => c.key === active) || CATEGORIES[0];
  const items = arr(evidence[current.key]);
  const failed = Boolean(searchErrors[current.key]) || coverage[current.key]?.status === "failed";

  return (
    <section className="r-section">
      <SectionTitle note="Gathered independently through web search. These are not claims from you.">
        Web evidence
      </SectionTitle>

      <div className="workspace">
      <div className="tabs" role="tablist" aria-label="Evidence categories">
        {CATEGORIES.map((category) => {
          const count = arr(evidence[category.key]).length;
          const selected = category.key === active;
          return (
            <button
              key={category.key}
              type="button"
              role="tab"
              id={`tab-${category.key}`}
              aria-selected={selected}
              aria-controls={`panel-${category.key}`}
              className={`tab ${selected ? "tab-active" : ""}`}
              onClick={() => setActive(category.key)}
            >
              {category.label} <span className="tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="tab-panel" role="tabpanel" id={`panel-${current.key}`} aria-labelledby={`tab-${current.key}`}>
        <p className={current.key === "red_flags" ? "hint hint-callout" : "hint"}>
          {current.key === "red_flags" && <span aria-hidden="true">ⓘ</span>}
          <span>{current.hint}</span>
        </p>
        {failed && <p className="notice">This search failed, so this evidence is missing (not a negative result).</p>}
        {!failed && items.length === 0 && <p className="empty">No results were found for this search.</p>}
        <ul className="evidence-list">
          {items.map((item, index) => {
            const href = safeHref(item.link);
            return (
              <li
                className={current.key === "red_flags" ? "evidence-item evidence-general" : "evidence-item"}
                key={`${current.key}-${index}`}
              >
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="evidence-title">
                    {str(item.title) || "Untitled result"} <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <span className="evidence-title">{str(item.title) || "Untitled result"}</span>
                )}
                {item.domain && <span className="evidence-domain">{item.domain}</span>}
                {item.snippet && <p className="evidence-snippet">{item.snippet}</p>}
                {current.key === "red_flags" && (
                  <span className="general-tag">General search result · not proof of fraud</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      </div>
    </section>
  );
}

/* ---------- 5. match / mismatch ---------- */

function MatchTable({ matches, aiAvailable }) {
  return (
    <section className="r-section">
      <SectionTitle note="Your submitted details compared with the independent evidence.">
        Match / mismatch
      </SectionTitle>
      {matches.length === 0 ? (
        <p className="empty">
          {aiAvailable ? "No comparison items were produced." : "Comparison unavailable because automated analysis did not complete."}
        </p>
      ) : (
        <ul className="match-list">
          {matches.map((match, index) => {
            const config = MATCHES[match.status] || MATCHES.unverified;
            return (
              <li className={`match-row match-${config.tone}`} key={index}>
                <div className="match-head">
                  <strong>{match.item}</strong>
                  <Badge tone={config.tone} icon={config.icon}>{config.label}</Badge>
                </div>
                <p className="match-details">
                  {str(match.details)}
                  <Cites ids={match.source_ids} />
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------- 6. red flags ---------- */

function RedFlags({ flags, aiAvailable }) {
  return (
    <section className="r-section">
      <SectionTitle>Red flags / things to check</SectionTitle>
      {flags.length > 0 ? (
        <ul className="flag-list">
          {flags.map((flag, index) => (
            <li className="flag" key={index}>
              <span className="flag-icon" aria-hidden="true">⚠</span>
              <span><span className="sr-only">Warning: </span>{flag}</span>
            </li>
          ))}
        </ul>
      ) : aiAvailable ? (
        <p className="all-clear">
          <span aria-hidden="true">✓</span> No meaningful red flags were identified from the available evidence.
          This is not proof the opportunity is genuine, so still complete the steps below.
        </p>
      ) : (
        <p className="empty">Red-flag analysis is unavailable because automated analysis did not complete.</p>
      )}
    </section>
  );
}

/* ---------- 7. recommended next steps ---------- */

function NextSteps({ steps }) {
  if (steps.length === 0) return null;
  return (
    <section className="r-section">
      <SectionTitle>Recommended next steps</SectionTitle>
      <ol className="steps">
        {steps.map((step, index) => (
          <li key={index}>
            <span className="step-number" aria-hidden="true">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- 8. sources ---------- */

function Sources({ sources }) {
  const labelFor = (key) => CATEGORIES.find((c) => c.key === key)?.label || key;
  const list = sources.filter((s) => safeHref(s.url));
  return (
    <section className="r-section">
      <SectionTitle note="Every source below came from a live web search. Open them yourself before you decide.">
        Sources
      </SectionTitle>
      {list.length === 0 ? (
        <p className="empty">No sources with a usable link were found.</p>
      ) : (
        <ul className="source-grid">
          {list.map((source) => (
            <li className="source-card" key={source.id} id={`source-${source.id}`}>
              <div className="source-top">
                <span className="source-id">{source.id}</span>
                <span className="source-domain">{source.domain}</span>
              </div>
              <h3>{str(source.title) || source.domain}</h3>
              {source.snippet && <p className="source-snippet">{source.snippet}</p>}
              <div className="source-bottom">
                <span className="chips">
                  {arr(source.categories).map((c) => (
                    <span className="chip" key={c}>{labelFor(c)}</span>
                  ))}
                </span>
                <a
                  className="open-source"
                  href={safeHref(source.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open source ${source.id}: ${str(source.title)} (opens in a new tab)`}
                >
                  Open source ↗
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- full report ---------- */

function Report({ result }) {
  const report = normalizeReport(result.report);
  const evidence = result.evidence && typeof result.evidence === "object" ? result.evidence : {};
  const searchErrors = result.search_errors && typeof result.search_errors === "object" ? result.search_errors : {};
  const user = result.user_provided || {
    company: result.company,
    role: result.role,
    job_url: result.job_url,
    job_description: null,
  };

  if (!report) {
    return (
      <div className="report">
        <p className="notice" role="alert">
          The analysis for this report was unavailable. The raw evidence is shown below; please review it yourself.
        </p>
        <WebEvidence evidence={evidence} coverage={{}} searchErrors={searchErrors} />
        <Sources sources={arr(result.sources)} />
        <p className="disclaimer">{DISCLAIMER}</p>
      </div>
    );
  }

  return (
    <div className="report">
      <VerdictCard report={report} result={result} />
      <QuickSummary findings={report.findings} />
      <UserProvided user={user} urlDetails={result.url_details} />
      <WebEvidence evidence={evidence} coverage={report.coverage} searchErrors={searchErrors} />
      <MatchTable matches={report.matches} aiAvailable={report.aiAvailable} />
      <RedFlags flags={report.redFlags} aiAvailable={report.aiAvailable} />
      <NextSteps steps={report.steps} />
      <Sources sources={arr(result.sources)} />
      <p className="disclaimer">{DISCLAIMER}</p>
    </div>
  );
}

export default Report;
