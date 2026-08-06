export function ListToolbar({
  basePath,
  q,
  searchPlaceholder = "Search…",
  filters,
  addNew,
}: {
  basePath: string;
  q?: string;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  addNew?: React.ReactNode;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <form action={basePath} className="flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder={searchPlaceholder}
          className="h-10 w-full max-w-xs rounded-lg border border-border bg-background px-3 text-sm sm:w-64"
        />
        {filters}
      </form>
      {addNew && <div className="shrink-0">{addNew}</div>}
    </div>
  );
}
