export default function NoteLoading() {
  return (
    <section className="catalog-page note-route-loading" aria-live="polite" aria-busy="true">
      <div className="note-loading-card">
        <span className="note-loading-icon" aria-hidden="true" />
        <p>Opening your notes</p>
        <div className="note-loading-dots" aria-label="Loading">
          <span />
          <span />
          <span />
        </div>
      </div>
    </section>
  );
}
