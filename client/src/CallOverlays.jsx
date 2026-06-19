import React, { useEffect, useRef } from "react";

export const CallModal = ({ callerName, isVideo, onAccept, onReject }) => {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={{ marginBottom: "10px" }}>Incoming {isVideo ? "Video" : "Voice"} Call</h3>
        <p style={{ margin: "10px 0" }}><strong>{callerName}</strong> is calling you...</p>
        <div style={styles.btnContainer}>
          <button onClick={onAccept} style={{ ...styles.btn, ...styles.acceptBtn }}>Accept</button>
          <button onClick={onReject} style={{ ...styles.btn, ...styles.rejectBtn }}>Reject</button>
        </div>
      </div>
    </div>
  );
};

export const ActiveCall = ({ localStream, remoteStream, callState, isVideo, isMuted, isCamOff, onMute, onCam, onHangUp }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  return (
    <div style={styles.fullscreenContainer}>
      <div style={styles.callCard}>
        <h4 style={{ marginBottom: "20px" }}>{callState === "calling" ? "Dialing..." : "Connected"}</h4>
        {isVideo && (
          <div style={styles.videoGrid}>
            <div style={styles.videoWrapper}>
              <p style={styles.label}>You</p>
              <video ref={localVideoRef} autoPlay playsInline muted style={styles.videoElement} />
            </div>
            {remoteStream && (
              <div style={styles.videoWrapper}>
                <p style={styles.label}>Remote User</p>
                <video ref={remoteVideoRef} autoPlay playsInline style={styles.videoElement} />
              </div>
            )}
          </div>
        )}
        {!isVideo && <div style={styles.audioPlaceholder}>🎙️ Audio Call Active</div>}
        <div style={styles.controls}>
          <button onClick={onMute} style={isMuted ? styles.activeControlBtn : styles.controlBtn}>{isMuted ? "Unmute" : "Mute"}</button>
          {isVideo && <button onClick={onCam} style={isCamOff ? styles.activeControlBtn : styles.controlBtn}>{isCamOff ? "Turn Cam On" : "Turn Cam Off"}</button>}
          <button onClick={onHangUp} style={styles.hangUpBtn}>Hang Up</button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(6,6,15,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 },
  modal: { backgroundColor: "#12122A", padding: "28px", borderRadius: "16px", textAlign: "center", border: "1px solid #2A2A4A", color: "#F0EEFF", minWidth: "280px" },
  btnContainer: { display: "flex", gap: "16px", marginTop: "24px", justifyContent: "center" },
  btn: { padding: "10px 24px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontFamily: "'Outfit', sans-serif" },
  acceptBtn: { backgroundColor: "#10B981", color: "#fff" },
  rejectBtn: { backgroundColor: "#EF4444", color: "#fff" },
  fullscreenContainer: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#06060F", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9998 },
  callCard: { backgroundColor: "#0D0D1A", padding: "40px", borderRadius: "24px", border: "1px solid #2A2A4A", color: "#fff", textAlign: "center" },
  videoGrid: { display: "flex", gap: "20px", margin: "24px 0", flexWrap: "wrap", justifyContent: "center" },
  videoWrapper: { position: "relative", width: "280px", height: "210px", backgroundColor: "#12122A", borderRadius: "12px", overflow: "hidden", border: "1px solid #2A2A4A" },
  videoElement: { width: "100%", height: "100%", objectFit: "cover" },
  label: { position: "absolute", top: 8, left: 8, backgroundColor: "rgba(6,6,15,0.6)", margin: 0, padding: "3px 8px", borderRadius: "4px", fontSize: "11px", zIndex: 2 },
  audioPlaceholder: { fontSize: "28px", margin: "40px 0", color: "#BDB8D8" },
  controls: { display: "flex", gap: "14px", justifyContent: "center", marginTop: "24px" },
  controlBtn: { padding: "10px 18px", borderRadius: "8px", border: "1px solid #2A2A4A", cursor: "pointer", backgroundColor: "#12122A", color: "#BDB8D8", fontFamily: "'Outfit', sans-serif" },
  activeControlBtn: { padding: "10px 18px", borderRadius: "8px", border: "none", cursor: "pointer", backgroundColor: "#F97316", color: "#fff", fontFamily: "'Outfit', sans-serif" },
  hangUpBtn: { padding: "10px 24px", borderRadius: "8px", border: "none", cursor: "pointer", backgroundColor: "#EF4444", color: "#fff", fontWeight: "700", fontFamily: "'Outfit', sans-serif" }
};
