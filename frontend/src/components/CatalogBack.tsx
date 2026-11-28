type CatalogBackProps = {
  onBack?: () => void;
  label?: string;
};

export function CatalogBack({ onBack, label = 'Volver al catálogo' }: CatalogBackProps) {
  const props = { className: 'button button-secondary catalog-back', 'aria-label': label, title: label };
  const arrow = (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 12H4m7-7-7 7 7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return onBack ? (
    <button type="button" {...props} onClick={onBack}>
      {arrow}
    </button>
  ) : (
    <a {...props} href="#contenido">
      {arrow}
    </a>
  );
}
