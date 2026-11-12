// Label + control + helper + inline error in one place, so every modal field is
// labelled and described consistently. A required control gets a visual asterisk.
export default function Field({ label, htmlFor, help, error, children }) {
  const kids = Array.isArray(children) ? children : [children];
  const required = kids.some((c) => c && c.props && c.props.required);
  return (
    <div className="form-group">
      <label htmlFor={htmlFor}>
        {label}
        {required && <span className="req" aria-hidden="true"> *</span>}
      </label>
      {children}
      {help && <span className="field-help" id={`${htmlFor}-help`}>{help}</span>}
      {error && <span className="field-error" id={`${htmlFor}-error`}>{error}</span>}
    </div>
  );
}
