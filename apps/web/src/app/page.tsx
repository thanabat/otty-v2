import { webEnv } from "../lib/env";

const checks = [
  "Workspace is split into web, api, and shared packages.",
  "LIFF-facing frontend will live in this Next.js app.",
  "Feature modules have not been implemented yet."
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Initial Scaffold</p>
        <h1>Otty V2</h1>
        <p className="lead">
          This is the LIFF web entrypoint for the employee platform. The current
          state is setup-only, so this screen exists to verify the workspace and
          environment wiring before feature work starts.
        </p>
      </section>

      <section className="info-grid">
        <article className="info-card">
          <h2>Runtime</h2>
          <dl>
            <div>
              <dt>Environment</dt>
              <dd>{webEnv.appEnv}</dd>
            </div>
            <div>
              <dt>API Base URL</dt>
              <dd>{webEnv.apiBaseUrl}</dd>
            </div>
            <div>
              <dt>LIFF ID</dt>
              <dd>{webEnv.liffId || "Not configured yet"}</dd>
            </div>
          </dl>
        </article>

        <article className="info-card">
          <h2>Setup Checklist</h2>
          <ul>
            {checks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}

