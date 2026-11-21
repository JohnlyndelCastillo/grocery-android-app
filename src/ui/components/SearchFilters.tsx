interface SearchFieldProps {
  id: string;
  label: string;
  placeholder: string;
}

export function SearchField({ id, label, placeholder }: SearchFieldProps) {
  return (
    <label className="search-field">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
      <input id={id} type="search" aria-label={label} placeholder={placeholder} />
    </label>
  );
}

interface SearchFiltersProps {
  id: string;
  label: string;
  placeholder: string;
  filters: string[];
}

/** Visual search and filter controls. Filtering behavior is intentionally not wired yet. */
export function SearchFilters({ id, label, placeholder, filters }: SearchFiltersProps) {
  return (
    <div id={id} className="search-controls">
      <div className="search-row">
        <SearchField id={`${id}-input`} label={label} placeholder={placeholder} />
        <button className="search-filter-button" type="button" aria-label={`Filter ${label.toLowerCase()}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h16M7 12h10m-7 5h4" />
            <circle cx="8" cy="7" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="11" cy="17" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </div>
      <div className="filter-chips" role="group" aria-label={`${label} filters`}>
        {filters.map((filter, index) => (
          <button key={filter} className={`filter-chip${index === 0 ? " active" : ""}`} type="button" aria-pressed={index === 0}>
            {filter}
          </button>
        ))}
      </div>
    </div>
  );
}
