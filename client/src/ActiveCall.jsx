import React, { useEffect, useRef } from "react";

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
        <h4>{callState === "calling" ? "Dialing..." : "Connected"}</h4>
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
  fullscreenContainer: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#1a1a1a", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9998 },
  callCard: { backgroundColor: "#2d2d2d", padding: "30px", borderRadius: "16px", color: "#fff", textAlign: "center" },
  videoGrid: { display: "flex", gap: "15px", margin: "20px 0", flexWrap: "wrap", justifyContent: "center" },
  videoWrapper: { position: "relative", width: "240px", height: "180px", backgroundColor: "#000", borderRadius: "8px", overflow: "hidden" },
  videoElement: { width: "100%", height: "100%", objectFit: "cover" },
  label: { position: "absolute", top: 5, left: 5, backgroundColor: "rgba(0,0,0,0.5)", margin: 0, padding: "2px 6px", fontSize: "12px", zIndex: 2 },
  audioPlaceholder: { fontSize: "24px", margin: "40px 0" },
  controls: { display: "flex", gap: "12px", justifyContent: "center", marginTop: "20px" },
  controlBtn: { padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", backgroundColor: "#444", color: "#fff" },
  activeControlBtn: { padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", backgroundColor: "#e67e22", color: "#fff" },
  hangUpBtn: { padding: "8px 20px", borderRadius: "6px", border: "none", cursor: "pointer", backgroundColor: "#e74c3c", color: "#fff", fontWeight: "bold" }
};
