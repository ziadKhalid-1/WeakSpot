// Progress bar: sand track 6px, olive fill growing from inline-start (right in RTL).
export default function ProgressBar({ value, label }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
    >
      <div className="progress__fill" style={{ inlineSize: `${pct}%` }} />
    </div>
  );
}
