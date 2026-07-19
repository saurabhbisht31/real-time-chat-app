import React, { useEffect, useRef } from "react";

export const CallModal = ({ callerName, isVideo, onAccept, onReject }) => {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.pulseDot} />
        <div style={styles.eyebrow}>Incoming {isVideo ? "Video" : "Voice"} Call</div>
        <h3 style={styles.title}>{callerName || "Someone"}</h3>
        <p style={styles.subtitle}>is calling you right now</p>
        <div style={styles.btnContainer}>
          <button onClick={onAccept} style={{ ...styles.btn, ...styles.acceptBtn }}>Accept</button>
          <button onClick={onReject} style={{ ...styles.btn, ...styles.rejectBtn }}>Reject</button>
        </div>
      </div>
    </div>
  );
};

export const ActiveCall = ({ localStream, remoteStream, callState, isVideo, isMuted, isCamOff, onMute, onCam, onHangUp, peerName, callDuration }) => {
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
        <div style={styles.headerRow}>
          <div>
            <div style={styles.eyebrow}>{callState === "calling" ? "Calling" : "Connected"}</div>
            <h3 style={styles.peerName}>{peerName || "Contact"}</h3>
          </div>
          <div style={styles.durationBadge}>{callDuration > 0 ? `${Math.floor(callDuration / 60)}:${String(callDuration % 60).padStart(2, "0")}` : "connecting"}</div>
        </div>
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
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(6,6,15,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, backdropFilter: "blur(10px)" },
  modal: { background: "linear-gradient(135deg, #0D0D1A 0%, #12122A 100%)", padding: "32px", borderRadius: "24px", textAlign: "center", border: "1px solid rgba(124,58,237,0.25)", color: "#F0EEFF", minWidth: "320px", boxShadow: "0 18px 40px rgba(0,0,0,0.35)" },
  pulseDot: { width: 12, height: 12, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 0 8px rgba(16,185,129,0.16)", margin: "0 auto 12px auto", animation: "pulse 1.2s ease-in-out infinite" },
  eyebrow: { textTransform: "uppercase", letterSpacing: "0.24em", fontSize: "10px", color: "#C084FC", marginBottom: "8px" },
  title: { fontSize: "24px", fontWeight: 700, margin: 0 },
  subtitle: { margin: "8px 0 0", color: "#BDB8D8" },
  btnContainer: { display: "flex", gap: "16px", marginTop: "24px", justifyContent: "center" },
  btn: { padding: "10px 24px", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", fontFamily: "'Outfit', sans-serif", transition: "transform 0.2s ease" },
  acceptBtn: { background: "linear-gradient(135deg, #10B981, #34D399)", color: "#fff", boxShadow: "0 8px 18px rgba(16,185,129,0.25)" },
  rejectBtn: { background: "linear-gradient(135deg, #EF4444, #F87171)", color: "#fff", boxShadow: "0 8px 18px rgba(239,68,68,0.25)" },
  fullscreenContainer: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(6,6,15,0.96)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9998, backdropFilter: "blur(10px)" },
  callCard: { background: "linear-gradient(135deg, #0D0D1A 0%, #12122A 100%)", padding: "32px", borderRadius: "24px", border: "1px solid rgba(124,58,237,0.25)", color: "#fff", textAlign: "center", minWidth: "340px", boxShadow: "0 20px 40px rgba(0,0,0,0.35)" },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "18px" },
  peerName: { fontSize: "22px", fontWeight: 700, margin: 0 },
  durationBadge: { background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.35)", color: "#C084FC", padding: "8px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 600 },
  videoGrid: { display: "flex", gap: "20px", margin: "24px 0", flexWrap: "wrap", justifyContent: "center" },
  videoWrapper: { position: "relative", width: "280px", height: "210px", backgroundColor: "#12122A", borderRadius: "12px", overflow: "hidden", border: "1px solid #2A2A4A", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" },
  videoElement: { width: "100%", height: "100%", objectFit: "cover" },
  label: { position: "absolute", top: 8, left: 8, backgroundColor: "rgba(6,6,15,0.6)", margin: 0, padding: "3px 8px", borderRadius: "4px", fontSize: "11px", zIndex: 2 },
  audioPlaceholder: { fontSize: "28px", margin: "40px 0", color: "#BDB8D8" },
  controls: { display: "flex", gap: "14px", justifyContent: "center", marginTop: "24px", flexWrap: "wrap" },
  controlBtn: { padding: "10px 18px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", backgroundColor: "rgba(255,255,255,0.04)", color: "#BDB8D8", fontFamily: "'Outfit', sans-serif" },
  activeControlBtn: { padding: "10px 18px", borderRadius: "10px", border: "none", cursor: "pointer", backgroundColor: "#F97316", color: "#fff", fontFamily: "'Outfit', sans-serif" },
  hangUpBtn: { padding: "10px 24px", borderRadius: "10px", border: "none", cursor: "pointer", backgroundColor: "#EF4444", color: "#fff", fontWeight: "700", fontFamily: "'Outfit', sans-serif" }
};
