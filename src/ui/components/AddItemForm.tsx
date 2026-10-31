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
    <form id="add-form" className="mb-[25px] flex gap-[9px]" noValidate onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="new-name">New grocery item</label>
      <input
        id="new-name"
        ref={inputRef}
        className={`min-w-0 flex-1 ${invalid ? "invalid" : ""}`}
        placeholder="What do you need?"
        required
        autoComplete="off"
        aria-invalid={invalid ? "true" : undefined}
        onInput={(event) => {
          if (event.currentTarget.value.trim()) setInvalid(false);
        }}
      />
      <button className="min-h-12 shrink-0 whitespace-nowrap rounded-xl bg-green px-[15px] font-bold text-white shadow-[0_4px_10px_var(--color-button-shadow)] hover:bg-green-dark max-[380px]:px-[11px]" type="submit">
        <span className="mr-[2px] align-[-1px] text-[1.15rem]" aria-hidden="true">＋</span> Add item
      </button>
    </form>
  );
}
