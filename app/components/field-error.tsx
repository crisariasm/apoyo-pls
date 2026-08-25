export function FieldError({ message }: { message?: string }) {
  return message ? <span className="form-field-error">{message}</span> : null
}
