import styles from "./controls.module.css";

export interface ControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function RangeControl({
  label,
  value,
  onChange,
  min = "0",
  max = "100",
  step = "1",
  unit = "",
}: ControlProps & {
  min?: string;
  max?: string;
  step?: string;
  unit?: string;
}) {
  const numValue = parseFloat(value);
  return (
    <div className={styles.control}>
      <label className={styles.label}>{label}</label>
      <div className={styles.rangeWrapper}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={numValue}
          onChange={(e) => onChange(e.target.value + unit)}
          className={styles.range}
        />
        <span className={styles.value}>{value}</span>
      </div>
    </div>
  );
}

export function ColorControl({ label, value, onChange }: ControlProps) {
  return (
    <div className={styles.control}>
      <label className={styles.label}>{label}</label>
      <div className={styles.colorWrapper}>
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className={styles.colorInput}
        />
        <span className={styles.value}>{value}</span>
      </div>
    </div>
  );
}

export function NumberControl({
  label,
  value,
  onChange,
  step = "1",
  unit = "",
}: ControlProps & { step?: string; unit?: string }) {
  return (
    <div className={styles.control}>
      <label className={styles.label}>{label}</label>
      <div className={styles.numberWrapper}>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value + unit)}
          step={step}
          className={styles.numberInput}
        />
        <span className={styles.unit}>{unit}</span>
      </div>
    </div>
  );
}

export function SelectControl({
  label,
  value,
  onChange,
  options,
}: ControlProps & { options: Array<{ label: string; value: string }> }) {
  return (
    <div className={styles.control}>
      <label className={styles.label}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.select}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
