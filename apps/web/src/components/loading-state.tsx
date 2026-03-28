"use client";

type ProfileLoadingStateProps = {
  eyebrow: string;
  title: string;
  description: string;
};

type ConnectionsLoadingStateProps = {
  eyebrow: string;
  title: string;
  description: string;
  itemCount?: number;
};

export function ProfileLoadingState({
  eyebrow,
  title,
  description
}: ProfileLoadingStateProps) {
  return (
    <main className="profile-stage">
      <section className="profile-spotlight" aria-busy="true">
        <div className="profile-spotlight__glow" />
        <article className="phone-profile-card phone-profile-card--loading">
          <div className="phone-profile-card__media">
            <div className="loading-block loading-block--media" />
          </div>

          <div className="phone-profile-card__content">
            <div className="loading-copy">
              <p className="eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
              <p className="lead lead--dark">{description}</p>
            </div>

            <div className="phone-profile-card__footer">
              <div className="phone-profile-card__details-grid">
                <section className="profile-detail-card">
                  <div className="loading-block loading-block--eyebrow" />
                  <div className="loading-stack">
                    <div className="loading-block loading-block--line" />
                    <div className="loading-block loading-block--line loading-block--line-short" />
                  </div>
                </section>

                <section className="profile-detail-card">
                  <div className="loading-block loading-block--eyebrow" />
                  <div className="loading-grid">
                    <div className="loading-block loading-block--line" />
                    <div className="loading-block loading-block--line" />
                    <div className="loading-block loading-block--line" />
                    <div className="loading-block loading-block--line loading-block--line-short" />
                  </div>
                </section>

                <section className="profile-detail-card profile-detail-card--full">
                  <div className="loading-block loading-block--eyebrow" />
                  <div className="loading-stack">
                    <div className="loading-block loading-block--line" />
                    <div className="loading-block loading-block--line" />
                    <div className="loading-block loading-block--line loading-block--line-medium" />
                  </div>
                </section>
              </div>

              <div className="loading-block loading-block--button" />
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}

export function ConnectionsLoadingState({
  eyebrow,
  title,
  description,
  itemCount = 3
}: ConnectionsLoadingStateProps) {
  return (
    <main className="profile-stage profile-stage--top">
      <div className="page-shell page-shell--connections" aria-busy="true">
        <section
          aria-label={`${eyebrow} ${title}. ${description}`}
          className="hero-card hero-card--dark hero-card--connections loading-scene-card"
        >
          <div className="loading-stack">
            <div className="loading-block loading-block--eyebrow" />
            <div className="loading-block loading-block--hero-title" />
            <div className="loading-block loading-block--hero-title loading-block--hero-title-short" />
            <div className="loading-block loading-block--line loading-block--line-medium" />
          </div>
        </section>

        <div className="button-row button-row--compact button-row--toolbar">
          <div className="loading-block loading-block--button loading-block--button-secondary" />
        </div>

        <section className="connections-list">
          {Array.from({ length: itemCount }, (_, index) => (
            <article className="connection-card connection-card--dark loading-card" key={index}>
              <div className="loading-stack">
                <div className="loading-block loading-block--title" />
                <div className="loading-block loading-block--line loading-block--line-medium" />
                <div className="loading-block loading-block--line loading-block--line-short" />
                <div className="loading-block loading-block--line loading-block--line-medium" />
                <div className="loading-block loading-block--line loading-block--line-short" />
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
