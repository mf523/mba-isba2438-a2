export default function Field({
  id,
  label,
  name,
  type = "text",
  error,
  defaultValue,
  placeholder,
}: {
  id: string;
  label: string;
  name: string;
  type?: string;
  error?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
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
