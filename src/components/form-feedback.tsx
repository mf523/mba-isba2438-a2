export default function FormFeedback({
  status,
  message,
  children,
}: {
  status: "success" | "error";
  message: string;
  children?: React.ReactNode;
}) {
  const isSuccess = status === "success";
  return (
    <p
      className={`form-feedback ${isSuccess ? "form-feedback-success" : "form-feedback-error"}`}
      role={isSuccess ? "status" : "alert"}
      aria-live="polite"
    >
      {message}
      {children}
    </p>
  );
}
