export default function TextareaField({
  id,
  label,
  name,
  error,
  defaultValue,
  placeholder,
  rows = 6,
}: {
  id: string;
  label: string;
  name: string;
  error?: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
