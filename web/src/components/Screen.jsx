// Screen: paper ground, padding 24/20/32, content on top, actions pinned to the bottom.
export default function Screen({ header, actions, children }) {
  return (
    <main className="screen">
      {header}
      <div className="screen__body">{children}</div>
      {actions && <div className="screen__actions">{actions}</div>}
    </main>
  );
}

export function AppHeader() {
  return (
    <header className="app-header">
      <p className="t-action">اعرف نقاط ضعفك</p>
    </header>
  );
}

export function PageHeading({ title, helper }) {
  return (
    <div className="page-heading">
      <h1 className="t-title">{title}</h1>
      {helper && <p className="t-label c-stone">{helper}</p>}
    </div>
  );
}
