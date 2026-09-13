export function StepExamples({ examples }: { examples?: string[] }) {
  if (!examples?.length) return null;

  return (
    <ul className="space-y-1 rounded-lg border border-b1 bg-s2/40 p-3 text-sm text-t2">
      {examples.map((example) => <li key={example}>Exemple : {example}</li>)}
    </ul>
  );
}
