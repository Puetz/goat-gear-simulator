interface ErrorScreenProps {
  title: string;
  intro: string;
  problems: readonly string[];
}

/** Shown instead of the app when it can't start, so the problem is easy to find. */
export function ErrorScreen({ title, intro, problems }: ErrorScreenProps) {
  return (
    <main className="mx-auto grid h-full max-w-3xl content-center gap-4 p-8">
      <h1 className="font-display text-4xl text-outline">{title}</h1>
      <div className="rounded-[20px] border-3 border-ink bg-well p-5 shadow-ink-md">
        <p className="mb-3 font-semibold">{intro}</p>
        <ul className="grid list-disc gap-1 pl-5 font-mono text-sm">
          {[...new Set(problems)].map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
