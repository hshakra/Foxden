// a titled group sitting on the canvas, the only sectioning pattern
// title, optional description, actions on the right, content below
export function Group({ title, description, actions, children, id }) {
  return (
    <section id={id} className="min-w-0">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-title font-medium">{title}</h2>
          {description && (
            <p className="mt-0.5 text-secondary text-ink-mid">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </header>
      <div className="mt-2">{children}</div>
    </section>
  );
}
