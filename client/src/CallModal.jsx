import React from "react";

export const CallModal = ({ callerName, isVideo, onAccept, onReject }) => {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3>Incoming {isVideo ? "Video" : "Voice"} Call</h3>
        <p><strong>{callerName}</strong> is calling you...</p>
        <div style={styles.btnContainer}>
          <button onClick={onAccept} style={{ ...styles.btn, ...styles.acceptBtn }}>Accept</button>
          <button onClick={onReject} style={{ ...styles.btn, ...styles.rejectBtn }}>Reject</button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 },
  modal: { backgroundColor: "#fff", padding: "24px", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", color: "#333" },
  btnContainer: { display: "flex", gap: "16px", marginTop: "20px", justifyContent: "center" },
  btn: { padding: "10px 24px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" },
  acceptBtn: { backgroundColor: "#2ecc71", color: "#fff" },
  rejectBtn: { backgroundColor: "#e74c3c", color: "#fff" }
};
