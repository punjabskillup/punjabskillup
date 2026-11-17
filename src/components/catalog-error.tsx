export function CatalogError({
  message = "We couldn't load this content. Please refresh the page and try again.",
}: {
  message?: string;
}) {
  return (
    <div className="catalog-error" role="alert">
      {message}
    </div>
  );
}
