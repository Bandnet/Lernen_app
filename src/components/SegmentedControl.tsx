interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className="segmented" role="tablist" style={{ ['--count' as string]: options.length, ['--index' as string]: index }}>
      <span className="segmented-thumb" />
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
