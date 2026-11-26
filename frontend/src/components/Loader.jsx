// A spinner + message, shown while waiting for an answer.
// Props:
//   message - text next to the spinner, e.g. "Thinking..."
function Loader({ message }) {
  return (
    // role="status" + aria-live: screen readers announce the message without moving focus
    <div className="card loader" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="muted">{message}</span>
    </div>
  );
}

export default Loader;
