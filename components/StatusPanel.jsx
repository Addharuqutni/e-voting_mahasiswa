// One notice surface for the voter flow (closed booth, already voted, locked or
// published results, receipt). Same padding, type scale and action row everywhere.
export default function StatusPanel({ tone = "brand", icon, title, children, meta, actions }) {
  return (
    <section className={`panel${tone === "success" ? " panel--success" : ""}`} aria-labelledby="panel-title">
      <div className="panel-icon" aria-hidden="true"><i className={icon} /></div>
      <h2 id="panel-title">{title}</h2>
      {children}
      {meta && <div className="panel-meta">{meta}</div>}
      {actions && <div className="panel-actions">{actions}</div>}
    </section>
  );
}
