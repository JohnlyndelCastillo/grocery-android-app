import { useRef, useState, type FormEvent } from "react";

interface AddItemFormProps {
  onAdd(name: string): void;
}

// The inset add bar from the approved list-detail design.
export function AddItemForm({ onAdd }: AddItemFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [invalid, setInvalid] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = inputRef.current?.value ?? "";
    if (!name.trim()) {
      setInvalid(true);
      inputRef.current?.focus();
      return;
    }
    setInvalid(false);
    onAdd(name);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <form id="add-form" className="add-bar flex" noValidate onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="new-name">New grocery item</label>
      <input
        id="new-name"
        ref={inputRef}
        className={`add-input ${invalid ? "invalid" : ""}`}
        placeholder="Add an item"
        required
        autoComplete="off"
        aria-invalid={invalid ? "true" : undefined}
        onInput={(event) => {
          if (event.currentTarget.value.trim()) setInvalid(false);
        }}
      />
      <button className="add-button whitespace-nowrap" type="submit">
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add
      </button>
    </form>
  );
}
