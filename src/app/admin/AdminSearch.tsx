import { Search } from "lucide-react";

// JS-free GET search: submitting navigates to ?q=… on the same page. Extra
// filter controls (e.g. a status <select>) can be passed as children.
export default function AdminSearch({
  placeholder,
  defaultValue,
  children,
}: {
  placeholder: string;
  defaultValue?: string;
  children?: React.ReactNode;
}) {
  return (
    <form className="mb-4 flex flex-wrap items-center gap-3" role="search">
      <div className="relative min-w-[14rem] flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="input-dark pl-9"
          aria-label={placeholder}
        />
      </div>
      {children}
      <button type="submit" className="btn-base btn-glow text-sm">
        Search
      </button>
    </form>
  );
}
