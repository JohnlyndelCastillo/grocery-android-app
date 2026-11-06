import { useRef, useState, type FormEvent } from "react";

interface AddItemFormProps {
  onAdd(name: string): void;
}

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
    <form id="add-form" className="mb-4 flex flex-wrap gap-2" noValidate onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="new-name">New grocery item</label>
      <input
        id="new-name"
        ref={inputRef}
        className={`min-w-[11rem] flex-1 bg-transparent ${invalid ? "invalid" : ""}`}
        placeholder="Add an item"
        required
        autoComplete="off"
        aria-invalid={invalid ? "true" : undefined}
        onInput={(event) => {
          if (event.currentTarget.value.trim()) setInvalid(false);
        }}
      />
      <button className="tap inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-green-fill px-4 font-semibold text-on-action" type="submit">
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add
      </button>
    </form>
  );
}
