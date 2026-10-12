// Photographic page banner: the same estate photograph language as the
// dashboard, with the page title, a line of context and the page's action.
export function PageHeader({ eyebrow, title, subtitle, image, actions }) {
  return (
    <header className="ce-banner">
      {image && <img src={image} alt="" aria-hidden="true" />}
      <div className="ce-banner-scrim" aria-hidden="true" />
      <div className="ce-banner-in">
        <div>
          {eyebrow && <div className="ce-eyebrow">{eyebrow}</div>}
          <h1 className="ce-title" data-testid="page-title">{title}</h1>
          {subtitle && <p className="ce-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="ce-actions">{actions}</div>}
      </div>
    </header>
  );
}
