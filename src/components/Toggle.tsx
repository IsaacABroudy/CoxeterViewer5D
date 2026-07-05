interface ToggleProps {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  ariaKeyShortcuts?: string;
  title?: string;
}

export function Toggle({
  checked,
  label,
  onChange,
  ariaKeyShortcuts,
  title,
}: ToggleProps) {
  return (
    <label className="toggle-row" title={title}>
      <input
        type="checkbox"
        aria-keyshortcuts={ariaKeyShortcuts}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
