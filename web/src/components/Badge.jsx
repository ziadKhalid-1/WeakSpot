import { fmtNumber } from '../lib/format.js';

// Badge: olive-tint fill, olive label text, radius 8. Static.
export default function Badge({ children }) {
  return <span className="badge t-label">{children}</span>;
}

// Groups slide numbers into runs: [4,5,6,9] -> «شرائح ٤ إلى ٦», «شريحة ٩».
export function SlideBadges({ slides }) {
  const sorted = [...new Set(slides ?? [])].sort((a, b) => a - b);
  const runs = [];
  for (const n of sorted) {
    const last = runs[runs.length - 1];
    if (last && n === last.to + 1) last.to = n;
    else runs.push({ from: n, to: n });
  }
  return (
    <div className="badges">
      {runs.map(({ from, to }) => (
        <Badge key={from}>
          {from === to ? `شريحة ${fmtNumber(from)}` : `شرائح ${fmtNumber(from)} إلى ${fmtNumber(to)}`}
        </Badge>
      ))}
    </div>
  );
}
