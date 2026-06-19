import { useEffect, useRef, useState } from "react";

export const useWebRTC = (socket, currentUserId, selectedUserId, onIncomingCall) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callState, setCallState] = useState("idle"); 
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);

  const peerConnection = useRef(null);
  const pendingCandidates = useRef([]);

  const rtcConfig = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  useEffect(() => {
    if (!socket) return;

    socket.on("incoming-call", ({ from, isVideo }) => {
      if (callState !== "idle") {
        socket.emit("call-rejected", { to: from, reason: "busy" });
        return;
      }
      setIsVideoCall(isVideo);
      setCallState("incoming");
      if (onIncomingCall) onIncomingCall({ from, isVideo });
    });

    socket.on("call-accepted", async ({ answer }) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState("active");
        while (pendingCandidates.current.length > 0) {
          const candidate = pendingCandidates.current.shift();
          await peerConnection.current.addIceCandidate(candidate);
        }
      }
    });

    socket.on("call-rejected", () => {
      cleanupCall();
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      if (peerConnection.current && peerConnection.current.remoteDescription) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        pendingCandidates.current.push(new RTCIceCandidate(candidate));
      }
    });

    socket.on("call-ended", () => {
      cleanupCall();
    });

    return () => {
      socket.off("incoming-call");
      socket.off("call-accepted");
      socket.off("call-rejected");
      socket.off("ice-candidate");
      socket.off("call-ended");
    };
  }, [socket, callState]);

  const startLocalStream = async (video) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video,
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
    }
  };

  const setupPeerConnection = (stream, targetId) => {
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnection.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { to: targetId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    return pc;
  };

  const initiateCall = async (isVideo) => {
    setIsVideoCall(isVideo);
    setCallState("calling");
    const stream = await startLocalStream(isVideo);
    if (!stream) {
      setCallState("idle");
      return;
    }
    const pc = setupPeerConnection(stream, selectedUserId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("initiate-call", { to: selectedUserId, offer, isVideo });
  };

  const acceptCall = async (callerId) => {
    setCallState("active");
    const stream = await startLocalStream(isVideoCall);
    if (!stream) {
      rejectCall(callerId);
      return;
    }
    const pc = setupPeerConnection(stream, callerId);
  };

  const handleIncomingOffer = async (callerId, offer) => {
    if (!peerConnection.current) {
      const stream = await startLocalStream(isVideoCall);
      setupPeerConnection(stream, callerId);
    }
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);
    socket.emit("answer-call", { to: callerId, answer });
  };

  const rejectCall = (callerId) => {
    socket.emit("call-rejected", { to: callerId });
    cleanupCall();
  };

  const endCall = (targetId) => {
    socket.emit("end-call", { to: targetId });
    cleanupCall();
  };

  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setIsMuted(false);
    setIsCamOff(false);
    pendingCandidates.current = [];
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOff(!videoTrack.enabled);
      }
    }
  };

  return {
    localStream, remoteStream, callState, isMuted, isCamOff, isVideoCall,
    initiateCall, acceptCall, rejectCall, endCall, toggleMute, toggleCamera,
    handleIncomingOffer, setCallState
  };
};
