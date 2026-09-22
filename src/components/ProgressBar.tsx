export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-fill" style={{ width: `${pct}%`, ...(color ? { background: color } : {}) }} />
    </div>
  );
}
