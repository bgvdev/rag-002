import { useEffect, useState } from "react";
import { checkHealth } from "../api";

// Shows whether the FastAPI backend is reachable.
function BackendStatus() {
  // "checking" -> "ok" or "error"
  const [status, setStatus] = useState("checking");

  // Runs once when this component first appears
  useEffect(() => {
    checkHealth()
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <p>
      Backend:{" "}
      <strong className={status === "ok" ? "status-ok" : "status-error"}>
        {status}
      </strong>
    </p>
  );
}

export default BackendStatus;
