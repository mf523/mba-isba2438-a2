export default function DeleteButton({
  confirmMessage,
  onDelete,
  label = "Delete",
  disabled = false,
}: {
  confirmMessage: string;
  onDelete: () => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      className="danger-button"
      type="button"
      disabled={disabled}
      onClick={() => {
        if (window.confirm(confirmMessage)) {
          onDelete();
        }
      }}
    >
      {label}
    </button>
  );
}
