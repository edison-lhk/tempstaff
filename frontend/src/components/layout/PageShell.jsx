export default function PageShell({ title, subtitle, actions, children }) {
  return (
    <div className="page-shell">
      <div className="page-shell__header">
        <div>
          {title ? <h1 className="page-shell__title">{title}</h1> : null}
          {subtitle ? <p className="page-shell__subtitle">{subtitle}</p> : null}
        </div>

        {actions ? <div className="page-shell__actions">{actions}</div> : null}
      </div>

      <div className="page-shell__content">{children}</div>
    </div>
  );
}