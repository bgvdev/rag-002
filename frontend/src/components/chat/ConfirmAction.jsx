// Human-in-the-loop: the agent PROPOSED an action, the user decides here.
// Props:
//   action    - the "confirm" event from the agent stream:
//               { action: "delete_document", document_id, filename }
//   onConfirm - called when the user clicks the confirm button
//   onCancel  - called when the user clicks Cancel
//   busy      - true while the confirmed action is running (disables the buttons)
function ConfirmAction({ action, onConfirm, onCancel, busy }) {
  if (!action) {
    return null; // nothing waiting for confirmation
  }

  // Text + button label for each kind of action the agent can propose
  const TEXT = {
    delete_document: {
      question: `Delete "${action.filename}" and all its chunks?`,
      button: "Delete",
      busyButton: "Deleting...",
    },
  };
  const text = TEXT[action.action];
  if (!text) {
    return null; // unknown action type: never show a button we can't explain
  }

  return (
    <div className="card" role="alertdialog" aria-label="Confirm action" style={{ borderColor: "var(--error)" }}>
      <p>
        ⚠️ The agent wants to make a change. <strong>{text.question}</strong>
      </p>
      <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>
        Nothing has been changed yet. This cannot be undone.
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        <button type="button" className="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="danger" onClick={onConfirm} disabled={busy}>
          {busy ? text.busyButton : text.button}
        </button>
      </div>
    </div>
  );
}

export default ConfirmAction;
