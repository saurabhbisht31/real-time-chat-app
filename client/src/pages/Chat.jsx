import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import { CallModal, ActiveCall } from "../CallOverlays";
const API_URL =
  import.meta.env.VITE_API_URL || "https://ubiquitous-spoon-96qvpvj799fx544-5000.app.github.dev";
const socket = io(API_URL, { transports: ["websocket"], reconnection: false });

const COLORS = ["#8B5CF6", "#EC4899", "#06B6D4", "#F59E0B", "#10B981", "#EF4444", "#3B82F6", "#F97316"];
const getColor = (name) => COLORS[(name?.charCodeAt(0) || 0) % COLORS.length];
const getInitials = (name) => name?.slice(0, 2).toUpperCase() || "??";
const POPULAR_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const buildMessageSummary = (messages) => {
  const textMessages = (messages || [])
    .map((message) => (message?.text || "").trim())
    .filter(Boolean);

  if (textMessages.length === 0) return "No new unseen messages are available for summarization yet.";

  const cleaned = textMessages
    .flatMap((text) => text.split(/[.!?\n]+/).map((part) => part.trim()).filter(Boolean))
    .slice(-10);

  const words = cleaned.join(" ").toLowerCase().match(/[a-z]{3,}/g) || [];
  const counts = {};

  words.forEach((word) => {
    counts[word] = (counts[word] || 0) + 1;
  });

  const topics = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([word]) => word);

  const preview = cleaned.slice(-3).join(" • ");
  const topicText = topics.length > 0 ? `Main themes: ${topics.join(", ")}.` : "";

  return `${topicText} Recent updates: ${preview}`.slice(0, 280);
};

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg0:#06060F;
  --bg1:#0D0D1A;
  --bg2:#12122A;
  --bg3:#1A1A35;
  --bg4:#22224A;
  --accent:#7C3AED;
  --accent2:#A855F7;
  --accent3:#C084FC;
  --teal:#06B6D4;
  --pink:#EC4899;
  --green:#10B981;
  --red:#EF4444;
  --text0:#F0EEFF;
  --text1:#BDB8D8;
  --text2:#7A748F;
  --border:#2A2A4A;
  --glow:rgba(124,58,237,0.25);
}

body{background:var(--bg0);font-family:'Outfit',sans-serif;overflow-x:hidden}

@keyframes fadeSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes msgIn{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes recPulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)}70%{box-shadow:0 0 0 8px rgba(239,68,68,0)}}
@keyframes borderGlow{0%,100%{border-color:var(--accent)}50%{border-color:var(--accent3)}}
@keyframes floatDot{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}

.app{display:flex;height:100dvh;min-height:100dvh;background:var(--bg0);overflow:hidden;position:relative}
.app::before{
  content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse 60% 50% at 15% 50%,rgba(124,58,237,.07) 0%,transparent 70%),
             radial-gradient(ellipse 40% 40% at 85% 20%,rgba(6,182,212,.05) 0%,transparent 60%);
  pointer-events:none;z-index:0
}

@media (max-width: 980px){
  .app{flex-direction:column;height:auto;min-height:100dvh;overflow:auto}
  .sidebar{width:min(88vw, 320px);max-height:none;border-right:none;border-bottom:none;position:fixed;left:0;top:0;bottom:0;transform:translateX(-100%);z-index:1100;transition:transform .2s ease}
  .sidebar.open{transform:translateX(0)}
  .chat-area{min-height:52vh}
}

@media (max-width: 640px){
  .mobile-nav-btn{display:flex}
  .sidebar-top{padding:14px 12px}
  .tabs{gap:4px;padding:3px}
  .tab{padding:7px 10px;font-size:11px}
  .search-wrap{padding:8px 12px}
  .contact-list{padding:6px 8px}
  .contact{padding:8px;border-radius:12px}
  .c-name{font-size:12px}
  .c-sub{font-size:10px}
  .sidebar-foot{padding:10px 12px}
  .chat-head{padding:10px 12px;flex-wrap:wrap;gap:8px}
  .head-name{font-size:14px}
  .msgs{padding:14px 12px}
  .bubble{max-width:88%;font-size:13px;padding:10px 12px}
  .hactions{display:flex}
  .ibar{padding:10px 12px;gap:8px;flex-wrap:wrap}
  .msginput{min-width:0}
  .reply-bar{padding:8px 12px;flex-wrap:wrap;gap:8px}
  .recbar{flex-direction:column;align-items:flex-start;gap:8px}
  .summary-card{margin:10px 12px 0}
  .summary-btn{font-size:11px;padding:7px 10px}
}

.sidebar{width:310px;flex-shrink:0;background:linear-gradient(180deg,var(--bg1) 0%,rgba(13,13,26,0.96) 100%);border-right:1px solid var(--border);display:flex;flex-direction:column;position:relative;z-index:1;backdrop-filter:blur(12px)}
.sidebar-top{padding:20px 16px 14px;border-bottom:1px solid var(--border);background:linear-gradient(180deg,rgba(18,18,42,0.95) 0%,rgba(13,13,26,0.95) 100%)}
.brand{font-family:'Outfit',sans-serif;font-size:16px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text0);margin-bottom:16px;display:flex;align-items:center;gap:8px}
.brand-dot{width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,var(--green),var(--teal));box-shadow:0 0 10px var(--green);animation:pulse 2s ease-in-out infinite}
.tabs{display:flex;gap:6px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:12px;padding:4px}
.tab{flex:1;padding:8px 12px;border:none;border-radius:10px;color:var(--text2);font-size:12px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;background:transparent;transition:all .2s ease}
.tab.on{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;box-shadow:0 6px 16px rgba(124,58,237,.28)}
.tab:not(.on):hover{background:rgba(255,255,255,0.05);color:var(--text1)}
.search-wrap{padding:10px 14px 8px;position:relative}
.search-wrap input{width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:12px;padding:9px 12px;color:var(--text0);font-size:13px;font-family:'Outfit',sans-serif;outline:none;transition:border-color .2s, box-shadow .2s}
.search-wrap input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(124,58,237,.15)}
.search-wrap input::placeholder{color:var(--text2)}
.contact-list{flex:1;overflow-y:auto;padding:6px 10px}
.contact-list::-webkit-scrollbar{width:3px}
.contact-list::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
.contact{display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;cursor:pointer;transition:all .2s ease;margin-bottom:4px;position:relative;animation:fadeSlideUp .25s ease both;border:1px solid transparent}
.contact:hover{background:rgba(255,255,255,0.05);transform:translateY(-1px)}
.contact.active{background:linear-gradient(135deg,rgba(124,58,237,.18),rgba(168,85,247,.08));border:1px solid rgba(124,58,237,.25);box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
.av{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0;position:relative;transition:transform .2s}
.contact:hover .av{transform:scale(1.06)}
.av img{width:40px;height:40px;border-radius:50%;object-fit:cover}
.av-ring{position:absolute;inset:-2px;border-radius:50%;border:2px solid transparent;transition:all .3s}
.contact.active .av-ring{border-color:var(--accent);box-shadow:0 0 10px rgba(124,58,237,.5)}
.status-ring{position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;border:2px solid var(--bg1)}
.online{background:var(--green);box-shadow:0 0 6px rgba(16,185,129,.6)}
.offline{background:var(--bg4)}
.c-info{flex:1;min-width:0}
.c-name{font-size:13px;font-weight:500;color:var(--text0);display:flex;align-items:center;justify-content:space-between;gap:4px}
.c-sub{font-size:11px;color:var(--text2);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.badge{background:var(--accent);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;min-width:20px;text-align:center;flex-shrink:0;box-shadow:0 2px 8px rgba(124,58,237,.5);animation:fadeIn .2s ease}
.sidebar-foot{padding:14px 16px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:10px;background:var(--bg1)}
.me-av{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0;cursor:pointer;position:relative;transition:transform .2s}
.me-av:hover{transform:scale(1.08)}
.me-av img{width:36px;height:36px;border-radius:50%;object-fit:cover}
.av-overlay{display:none;position:absolute;inset:0;border-radius:50%;background:rgba(0,0,0,.6);align-items:center;justify-content:center;font-size:9px;color:#fff;cursor:pointer}
.me-av:hover .av-overlay{display:flex}
.me-label{font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:.5px}
.me-name{font-size:13px;font-weight:600;color:var(--text0)}
.logout{margin-left:auto;background:transparent;border:1px solid var(--border);color:var(--text2);padding:6px 12px;border-radius:8px;cursor:pointer;font-size:11px;font-family:'Outfit',sans-serif;transition:all .2s}
.logout:hover{border-color:var(--red);color:var(--red);background:rgba(239,68,68,.06)}
.gpanel{background:linear-gradient(135deg,rgba(124,58,237,.08),rgba(6,182,212,.05));border:1px solid rgba(124,58,237,.25);border-radius:14px;padding:12px;margin-bottom:8px;animation:fadeSlideUp .2s ease}
.ginput{width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:10px;padding:8px 10px;color:var(--text0);font-size:12px;font-family:'Outfit',sans-serif;outline:none;margin-bottom:8px}
.gcreate{width:100%;padding:8px;background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:10px;color:#fff;font-size:12px;font-family:'Outfit',sans-serif;cursor:pointer;font-weight:600;transition:transform .2s,opacity .2s}
.gcreate:hover{opacity:.9;transform:translateY(-1px)}
.gnewbtn{width:100%;padding:9px;background:rgba(255,255,255,0.03);border:1px dashed var(--border);border-radius:10px;color:var(--text2);font-size:12px;font-family:'Outfit',sans-serif;cursor:pointer;margin-bottom:8px;transition:all .2s}
.gnewbtn:hover{border-color:var(--accent);color:var(--accent3);background:rgba(124,58,237,.08)}
.mcheck{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text1);margin-bottom:6px;cursor:pointer}

.chat-area{flex:1;display:flex;flex-direction:column;background:var(--bg0);position:relative;z-index:1;min-width:0;min-height:0}
.chat-head{padding:14px 24px;display:flex;align-items:center;gap:14px;background:linear-gradient(180deg,rgba(18,18,42,0.95) 0%,rgba(13,13,26,0.95) 100%);border-bottom:1px solid var(--border);position:relative;animation:fadeIn .3s ease}
.chat-head::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(124,58,237,.3),transparent)}
.head-name{font-size:15px;font-weight:600;color:var(--text0)}
.head-status{font-size:11px;margin-top:2px;display:flex;align-items:center;gap:5px}
.head-online{color:var(--green)}
.head-offline{color:var(--text2)}
.status-dot{width:6px;height:6px;border-radius:50%}
.sdot-on{background:var(--green);box-shadow:0 0 6px rgba(16,185,129,.7)}
.sdot-off{background:var(--text2)}
.msgs{flex:1;overflow-y:auto;padding:24px 28px;display:flex;flex-direction:column;gap:8px;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(124,58,237,.05) 0%,transparent 60%),linear-gradient(180deg,rgba(255,255,255,.015),transparent)}
.msgs::-webkit-scrollbar{width:4px}
.msgs::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
.mrow{display:flex;flex-direction:column;animation:msgIn .25s ease both}
.mrow.mine{align-items:flex-end}
.mrow.theirs{align-items:flex-start}
.sender-label{font-size:10px;font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px;padding:0 4px}
.bubble{max-width:62%;padding:12px 15px;font-size:14px;line-height:1.55;position:relative;word-break:break-word;transition:transform .1s ease;box-shadow:0 8px 24px rgba(0,0,0,.18)}
.bubble:active{transform:scale(.98)}
.bubble img{max-width:220px;border-radius:12px;display:block;cursor:pointer;margin-top:4px}
.bubble video{max-width:220px;border-radius:12px;display:block;margin-top:4px}
.bubble audio{max-width:240px;display:block;margin-top:6px;outline:none}
.mine .bubble{background:linear-gradient(135deg,#7C3AED,#A855F7);color:#fff;border-radius:18px 18px 4px 18px;box-shadow:0 10px 24px rgba(124,58,237,.28)}
.theirs .bubble{background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02));color:var(--text0);border:1px solid var(--border);border-radius:18px 18px 18px 4px}
.rquote{background:rgba(0,0,0,.25);border-left:3px solid rgba(255,255,255,.5);padding:6px 10px;border-radius:3px;margin-bottom:8px;font-size:12px;color:rgba(255,255,255,.7);cursor:pointer}
.theirs .rquote{border-color:var(--accent);color:var(--text2);background:rgba(124,58,237,.08)}
.rq-sender{font-weight:600;font-size:11px;margin-bottom:2px}
.mine .rq-sender{color:rgba(255,255,255,.9)}
.theirs .rq-sender{color:var(--accent3)}
.rx-line{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}
.rx-pill{background:var(--bg2);border:1px solid var(--border);border-radius:20px;padding:3px 8px;font-size:12px;display:flex;align-items:center;gap:4px;cursor:pointer;transition:all .15s;user-select:none}
.rx-pill:hover{border-color:var(--accent);background:var(--bg3)}
.rx-pill.hit{background:rgba(124,58,237,.15);border-color:var(--accent)}
.meta{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--text2);margin-top:4px;padding:0 2px}
.tick{font-size:12px}
.tick.seen{color:var(--teal)}
.hactions{display:none;flex-direction:column;gap:4px;margin-top:6px}
.mrow:hover .hactions{display:flex}
.hact-row{display:flex;gap:4px}
.hact-emojis{display:flex;gap:3px;background:var(--bg2);border:1px solid var(--border);border-radius:20px;padding:4px 8px}
.hact-emojis button{background:none;border:none;font-size:15px;cursor:pointer;transition:transform .15s;padding:1px 2px}
.hact-emojis button:hover{transform:scale(1.35)}
.hact-btns{display:flex;gap:4px}
.hbtn{background:var(--bg2);border:1px solid var(--border);color:var(--text1);padding:4px 10px;border-radius:8px;font-size:11px;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .15s}
.hbtn:hover{border-color:var(--accent3);color:var(--text0);background:var(--bg3)}
.hbtn.danger:hover{border-color:var(--red);color:var(--red);background:rgba(239,68,68,.06)}
.typing{padding:6px 28px;font-size:12px;color:var(--accent3);font-style:italic;min-height:26px;display:flex;align-items:center;gap:6px}
.typing-dots{display:flex;gap:4px;align-items:center}
.typing-dots span{width:5px;height:5px;border-radius:50%;background:var(--accent3);animation:floatDot .8s ease-in-out infinite}
.typing-dots span:nth-child(2){animation-delay:.1s}
.typing-dots span:nth-child(3){animation-delay:.2s}
.footer{display:flex;flex-direction:column;background:linear-gradient(180deg,rgba(13,13,26,0.95) 0%,rgba(10,10,20,0.96) 100%);border-top:1px solid var(--border)}
.reply-bar{display:flex;align-items:center;justify-content:space-between;background:var(--bg2);padding:10px 20px;border-bottom:1px solid var(--border);animation:fadeSlideUp .15s ease}
.rbar-info{border-left:3px solid var(--accent);padding-left:10px;border-radius:0}
.rbar-title{font-size:10px;font-weight:600;color:var(--accent3);text-transform:uppercase;letter-spacing:.5px}
.rbar-text{font-size:12px;color:var(--text2);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:400px}
.rbar-cancel{background:none;border:none;color:var(--red);font-size:18px;cursor:pointer;padding:4px;transition:transform .15s;line-height:1}
.rbar-cancel:hover{transform:rotate(90deg)}
.recbar{flex:1;display:flex;align-items:center;justify-content:space-between;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:14px;padding:10px 16px;color:var(--red);font-size:14px;font-weight:500;animation:borderGlow 2s linear infinite}
.recdot{width:9px;height:9px;border-radius:50%;background:var(--red);display:inline-block;margin-right:8px;animation:recPulse 1s ease infinite}
.recbtns{display:flex;gap:8px}
.ibar{padding:12px 18px;display:flex;align-items:center;gap:10px}
.ibtn{width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid var(--border);color:var(--text2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;transition:all .2s;flex-shrink:0}
.ibtn:hover{border-color:var(--accent3);color:var(--accent3);background:rgba(124,58,237,.08);transform:scale(1.05)}
.msginput{flex:1;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:14px;padding:11px 18px;color:var(--text0);font-family:'Outfit',sans-serif;font-size:14px;outline:none;transition:all .2s}
.msginput:focus{border-color:rgba(124,58,237,.5);box-shadow:0 0 0 3px rgba(124,58,237,.12)}
.msginput::placeholder{color:var(--text2)}
.sendbtn{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#7C3AED,#A855F7);border:none;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;flex-shrink:0;transition:all .2s;box-shadow:0 4px 14px rgba(124,58,237,.4)}
.sendbtn:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(124,58,237,.55)}
.sendbtn:active{transform:scale(.96)}
.mobile-nav-btn{display:none;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text0);cursor:pointer}
.mobile-backdrop{display:none;position:fixed;inset:0;background:rgba(2,4,12,0.6);z-index:1000}
.mobile-backdrop.open{display:block}
.empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:var(--text2);animation:fadeIn .5s ease;padding:24px}
.empty-icon{font-size:56px;filter:drop-shadow(0 0 20px rgba(124,58,237,.3));background:linear-gradient(135deg,var(--accent),var(--accent3));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.empty-title{font-size:18px;font-weight:600;color:var(--text1)}
.empty-sub{font-size:13px;color:var(--text2);max-width:360px;text-align:center;line-height:1.6}
.summary-btn{background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;color:#fff;padding:8px 12px;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 6px 16px rgba(124,58,237,.25)}
.summary-card{margin:12px 24px 0;padding:12px 14px;border:1px solid rgba(124,58,237,.24);background:linear-gradient(135deg,rgba(124,58,237,.12),rgba(6,182,212,.08));border-radius:14px;color:var(--text0);box-shadow:0 8px 24px rgba(0,0,0,.16)}
.summary-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:var(--accent3);margin-bottom:6px}
.summary-body{font-size:13px;line-height:1.55;color:var(--text1)}
.uploading{position:absolute;inset:0;background:rgba(6,6,15,.8);display:flex;align-items:center;justify-content:center;z-index:100}
.uload-spinner{width:44px;height:44px;border-radius:50%;border:3px solid var(--border);border-top-color:var(--accent);animation:spin .8s linear infinite}

.profile-meta-panel { background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; padding: 10px; width: 100%; display: flex; flex-direction: column; gap: 6px; }
.prof-row { display: flex; gap: 4px; }
.prof-input { flex: 1; background: var(--bg0); border: 1px solid var(--border); border-radius: 6px; padding: 6px; color: var(--text0); font-size: 11px; }
.prof-save { background: var(--accent); border: none; color: white; padding: 0 10px; border-radius: 6px; cursor: pointer; font-size: 11px; }
.pin-indicator { color: var(--pink); font-size: 11px; margin-left: auto; }
.mute-indicator { color: var(--text2); font-size: 11px; margin-left: 4px; }
.chat-action-btn { background: transparent; border: none; color: var(--text2); cursor: pointer; font-size: 11px; padding: 2px 4px; border-radius: 4px; }
.chat-action-btn:hover { color: var(--text0); background: var(--bg4); }
.edited-flag { font-size: 9px; opacity: 0.5; font-style: italic; margin-left: 4px; }

/* CALLING COMPONENT STYLES OVERLAYS */
.call-overlay { position: fixed; inset: 0; background: rgba(6,6,20,0.96); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; animation: fadeIn 0.3s ease; }
.call-card { background: linear-gradient(135deg, rgba(13,13,26,0.98) 0%, rgba(18,18,42,0.98) 100%); border: 1px solid rgba(124,58,237,0.25); padding: 32px; border-radius: 24px; display: flex; flex-direction: column; align-items: center; gap: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.45); text-align: center; max-width: 400px; width: 90%; }
.call-actions { display: flex; gap: 16px; margin-top: 10px; }
.call-btn { padding: 12px 24px; border: none; border-radius: 12px; font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.call-btn.accept { background: linear-gradient(135deg,var(--green),#34D399); color: white; box-shadow: 0 4px 14px rgba(16,185,129,0.35); }
.call-btn.decline { background: linear-gradient(135deg,var(--red),#F87171); color: white; box-shadow: 0 4px 14px rgba(239,68,68,0.35); }
.call-btn:hover { transform: scale(1.05); opacity: 0.95; }
.video-grid { display: flex; gap: 20px; width: 90%; max-width: 1000px; aspect-ratio: 16/10; position: relative; margin-bottom: 24px; }
.remote-video-wrap { flex: 1; background: #020208; border-radius: 16px; border: 1px solid var(--border); overflow: hidden; position: relative; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); }
.remote-video-wrap video { width: 100%; height: 100%; object-fit: cover; }
.local-video-wrap { width: 220px; aspect-ratio: 4/3; background: #090915; border-radius: 12px; border: 2px solid rgba(124,58,237,0.45); overflow: hidden; position: absolute; bottom: 16px; right: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.6); z-index: 10; }
.local-video-wrap video { width: 100%; height: 100%; object-fit: cover; }
`;

export default function Chat() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem("user")));

  const [activeTab, setActiveTab] = useState("chats");
  const [isMobileView, setIsMobileView] = useState(false);
  const [mobileView, setMobileView] = useState("list");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [groupMessage, setGroupMessage] = useState("");
  const [groupTypingUser, setGroupTypingUser] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [search, setSearch] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [summarizedMessageIds, setSummarizedMessageIds] = useState({});

  const [editingMessage, setEditingMessage] = useState(null);
  const [editInput, setEditInput] = useState("");

  const [showProfileConfig, setShowProfileConfig] = useState(false);
  const [customBio, setCustomBio] = useState(currentUser?.bio || "Hello! I am using Chat App.");
  const [customEmoji, setCustomEmoji] = useState(currentUser?.statusEmoji || "💬");

  const [lastSeenCache, setLastSeenCache] = useState({});

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const durationTimerRef = useRef(null);

  const [unreadCounts, setUnreadCounts] = useState({});

  // WebRTC Calling State Nodes
  const [callingState, setCallingState] = useState("idle"); // "idle" | "calling" | "ringing" | "connected"
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [callerName, setCallerName] = useState("");
  const [callType, setCallType] = useState("video"); // "video" | "audio"
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [localStreamState, setLocalStreamState] = useState(null);
  const [remoteStreamState, setRemoteStreamState] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const groupMessagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const groupTypingTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const ringtoneAudioRef = useRef(null);
  const ringtoneIntervalRef = useRef(null);
  const ringtoneOscillatorsRef = useRef([]);
  const audioUnlockedRef = useRef(false);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { groupMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [groupMessages]);

  useEffect(() => {
    const updateView = () => {
      const mobile = window.innerWidth <= 980;
      setIsMobileView(mobile);

      if (!mobile) {
        setShowMobileSidebar(false);
        setMobileView("desktop");
      } else {
        setShowMobileSidebar(Boolean(!selectedUser && !selectedGroup));
        setMobileView(selectedUser || selectedGroup ? "chat" : "list");
      }
    };

    updateView();
    window.addEventListener("resize", updateView);
    return () => window.removeEventListener("resize", updateView);
  }, [selectedUser, selectedGroup]);

  const ensureAudioContext = () => {
    if (typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioContextRef.current) audioContextRef.current = new AudioCtx();
    return audioContextRef.current;
  };

  const unlockAudio = async () => {
    const ctx = ensureAudioContext();
    if (!ctx) return null;
    if (!audioUnlockedRef.current) {
      try {
        if (ctx.state === "suspended") await ctx.resume();
        audioUnlockedRef.current = true;
      } catch (err) {
        console.warn("Audio unlock failed:", err);
      }
    }
    return ctx;
  };

  useEffect(() => {
    const unlock = () => {
      void unlockAudio();
    };
    const events = ["pointerdown", "touchstart", "keydown", "click"];
    events.forEach((eventName) => window.addEventListener(eventName, unlock, { once: true, passive: true }));
    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, unlock));
    };
  }, []);

  const stopRingtone = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    ringtoneOscillatorsRef.current.forEach((osc) => {
      try { osc.stop(); } catch {}
    });
    ringtoneOscillatorsRef.current = [];
    if (ringtoneAudioRef.current) {
      try {
        ringtoneAudioRef.current.pause();
        ringtoneAudioRef.current.currentTime = 0;
      } catch {}
    }
  };

  const playRingtone = async () => {
    await unlockAudio();
    stopRingtone();

    if (!ringtoneAudioRef.current) {
      ringtoneAudioRef.current = new Audio("/ringtone.wav");
      ringtoneAudioRef.current.loop = true;
      ringtoneAudioRef.current.volume = 0.9;
    }

    try {
      ringtoneAudioRef.current.currentTime = 0;
      await ringtoneAudioRef.current.play();
    } catch (err) {
      console.warn("Unable to play ringtone audio:", err);
    }
  };

  const playHangupTone = async () => {
    const ctx = await unlockAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(540, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  };

  useEffect(() => {
    if (callingState !== "connected") return;
    const timer = setInterval(() => setCallDuration((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [callingState]);

  useEffect(() => {
    if (!currentUser) return;
    axios.get(`${API_URL}/api/auth/users`).then(async (res) => {
      const filtered = res.data.filter((u) => u.name !== currentUser.name);
      setUsers(filtered);

      const initialCache = {};
      res.data.forEach(u => {
        if(u.lastSeen) initialCache[u.name] = u.lastSeen;
      });
      setLastSeenCache(initialCache);

      const ic = {};
      for (const u of filtered) {
        try {
          const r = await axios.get(`${API_URL}/api/messages?sender=${encodeURIComponent(u.name)}&receiver=${encodeURIComponent(currentUser.name)}`);
          const c = r.data.filter(m => m.sender === u.name && !m.seen).length;
          if (c > 0) ic[u.name] = c;
        } catch (err) {
          console.error("Failed to fetch unread count for user", u.name, err);
        }
      }
      setUnreadCounts(ic);

      if (!selectedUser && filtered.length > 0 && window.innerWidth > 980) {
        try {
          const savedSelection = localStorage.getItem("lastSelectedChatUser");
          if (savedSelection) {
            const parsed = JSON.parse(savedSelection);
            const matchedUser = filtered.find((u) => u._id === parsed._id || u.name === parsed.name);
            if (matchedUser) {
              setSelectedUser(matchedUser);
            } else {
              setSelectedUser(filtered[0]);
            }
          } else {
            setSelectedUser(filtered[0]);
          }
        } catch {
          setSelectedUser(filtered[0]);
        }
      }
    }).catch((err) => {
      console.error("Failed to load users", err);
    });
    axios.get(`${API_URL}/api/groups?username=${encodeURIComponent(currentUser.name)}`).then(r => setGroups(r.data)).catch((err) => {
      console.error("Failed to load groups", err);
    });
  }, [currentUser]);

  useEffect(() => {
    if (selectedUser) {
      localStorage.setItem("lastSelectedChatUser", JSON.stringify({ _id: selectedUser._id, name: selectedUser.name }));
    }
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedUser || !currentUser) return;
    setReplyTo(null);
    setEditingMessage(null);
    setSelectedGroup(null);
    setUnreadCounts(prev => { const u = {...prev}; delete u[selectedUser.name]; return u; });

    const sender = currentUser.name;
    const receiver = selectedUser.name;

    axios.get(`${API_URL}/api/messages?sender=${encodeURIComponent(sender)}&receiver=${encodeURIComponent(receiver)}`).then(async (res) => {
      const sorted = [...(res.data || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setMessages(sorted);
      setSummaryText("");
    }).catch(() => {
      setMessages([]);
    });
  }, [selectedUser, currentUser]);

  useEffect(() => {
    if (!selectedGroup) return;
    setReplyTo(null);
    setEditingMessage(null);
    setSelectedUser(null); 
    socket.emit("join_group", selectedGroup._id);
    axios.get(`${API_URL}/api/groups/${selectedGroup._id}/messages`).then((res) => {
      setGroupMessages(res.data);
      socket.emit("group_message_seen", { groupId: selectedGroup._id, username: currentUser.name });
    });
  }, [selectedGroup]);

  useEffect(() => {
    if (!currentUser) return;
    socket.emit("user_joined", currentUser.name);
    socket.on("connect", () => socket.emit("user_joined", currentUser.name));
    socket.on("online_users", data => setOnlineUsers(data));

    socket.on("user_logged_offline", ({ username, lastSeen }) => {
      setLastSeenCache(prev => ({ ...prev, [username]: lastSeen }));
    });

    socket.on("message_edited", ({ messageId, newText }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, text: newText, isEdited: true } : m));
    });

    socket.on("group_message_edited", ({ messageId, newText }) => {
      setGroupMessages(prev => prev.map(m => m._id === messageId ? { ...m, text: newText, isEdited: true } : m));
    });

    socket.on("receive_message", async (data) => {
      if (selectedUser && (data.sender === selectedUser.name || data.receiver === selectedUser.name)) {
        setMessages(prev => [...prev, data]);
      } else if (data.sender !== currentUser.name) {
        setUnreadCounts(prev => ({ ...prev, [data.sender]: (prev[data.sender] || 0) + 1 }));
      }
    });
    socket.on("messages_seen", ({ by }) => {
      setMessages(prev => prev.map(m => m.sender === currentUser.name && m.receiver === by ? { ...m, seen: true } : m));
    });
    socket.on("message_reaction_updated", updated => {
      setMessages(prev => prev.map(m => m._id === updated._id ? { ...m, reactions: [...(updated.reactions || [])] } : m));
    });
    socket.on("receive_group_message", data => {
      if (selectedGroup && data.groupId === selectedGroup._id) {
        setGroupMessages(prev => [...prev, data]);
        socket.emit("group_message_seen", { groupId: selectedGroup._id, username: currentUser.name });
      }
    });
    socket.on("group_messages_seen", ({ by, groupId }) => {
      setGroupMessages(prev => prev.map(m => m.groupId === groupId && !m.readBy?.includes(by) ? { ...m, readBy: [...(m.readBy || []), by] } : m));
    });
    socket.on("show_typing", name => { if (selectedUser && name === selectedUser.name) setTypingUser(name); });
    socket.on("hide_typing", () => setTypingUser(""));
    socket.on("show_group_typing", name => { if (selectedGroup && name !== currentUser.name) setGroupTypingUser(name); });
    socket.on("hide_group_typing", () => setGroupTypingUser(""));
    socket.on("message_deleted", ({ id }) => setMessages(prev => prev.filter(m => m._id !== id)));

    // WebRTC Real-Time Network Signaling Receivers Hooks
    socket.on("incoming_call", ({ from, offer, video }) => {
      setCallerName(from);
      setCallType(video ? "video" : "audio");
      setIncomingOffer(offer);
      setIsIncomingCall(true);
      setCallingState("ringing");
      playRingtone();
      setIsMuted(false);
      setIsCameraOff(false);
      setCallDuration(0);
    });

    socket.on("call_answered", async ({ answer }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallingState("connected");
        setCallDuration(0);
      }
    });

    socket.on("receive_ice_candidate", async ({ candidate }) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (e) {
        console.error("Error linking ICE candidate token payload mapping:", e);
      }
    });

    socket.on("call_ended", () => {
      cleanupCallTrack();
    });

    return () => {
      ["connect","online_users","receive_message","messages_seen","receive_group_message",
       "group_messages_seen","show_typing","hide_typing","show_group_typing",
       "hide_group_typing","message_deleted","message_reaction_updated", "user_logged_offline", 
       "message_edited", "group_message_edited", "incoming_call", "call_answered", "receive_ice_candidate", "call_ended"].forEach(e => socket.off(e));
    };
  }, [selectedUser, selectedGroup]);

  if (!token || !currentUser) return <h2 style={{color:"#F0EEFF",padding:40}}>Please Login First</h2>;

  // WebRTC Calling Actions Pipeline Engine
  const initiateCall = async (withVideo = true) => {
    setCallType(withVideo ? "video" : "audio");
    setCallingState("calling");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: withVideo, audio: true });
      localStreamRef.current = stream;
      setLocalStreamState(stream);
      setIsMuted(false);
      setIsCameraOff(false);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("send_ice_candidate", { candidate: e.candidate, to: selectedUser.name });
        }
      };

      pc.ontrack = (e) => {
        setRemoteStreamState(e.streams[0]);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socket.emit("initiate_call", { to: selectedUser.name, from: currentUser.name, offer, video: withVideo });
    } catch (err) {
      console.error("Failed to capture local media stream properties:", err);
      cleanupCallTrack();
    }
  };

  const answerIncomingCall = async () => {
    stopRingtone();
    setIsIncomingCall(false);
    setCallingState("connected");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: callType === "video", audio: true });
      localStreamRef.current = stream;
      setLocalStreamState(stream);
      setIsMuted(false);
      setIsCameraOff(false);
      
      // Delay briefly to allow components overlays to register video tracking nodes cleanly
      setTimeout(async () => {
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      }, 100);

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("send_ice_candidate", { candidate: e.candidate, to: callerName });
        }
      };

      pc.ontrack = (e) => {
        setRemoteStreamState(e.streams[0]);
      };

      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer_call", { to: callerName, answer });
    } catch (err) {
      console.error("Failed to map dynamic answering connection protocols:", err);
      cleanupCallTrack();
    }
  };

  const rejectOrHangupCall = () => {
    const target = selectedUser?.name || callerName;
    playHangupTone();
    socket.emit("hangup_call", { to: target });
    cleanupCallTrack();
  };

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
    }
  };

  const cleanupCallTrack = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    stopRingtone();
    setCallingState("idle");
    setIsIncomingCall(false);
    setCallerName("");
    setIncomingOffer(null);
    setLocalStreamState(null);
    setRemoteStreamState(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setCallDuration(0);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedUser) return;
    
    socket.emit("send_message", { 
      sender: currentUser.name, 
      receiver: selectedUser.name, 
      text: inputMessage, 
      replyTo: replyTo ? replyTo._id : null
    });

    socket.emit("stop_typing", { sender: currentUser.name, receiver: selectedUser.name });
    setInputMessage(""); setReplyTo(null);
  };

  const saveProfileSettings = async () => {
    try {
      const res = await axios.put(`${API_URL}/api/auth/update-profile`, {
        userId: currentUser.id || currentUser._id,
        bio: customBio,
        statusEmoji: customEmoji
      });
      const updated = { ...currentUser, bio: res.data.bio, statusEmoji: res.data.statusEmoji };
      localStorage.setItem("user", JSON.stringify(updated));
      setCurrentUser(updated);
      setShowProfileConfig(false);
    } catch (err) {
      console.error("Failed to map database configurations properties:", err);
    }
  };

  const togglePinChat = async (targetId, e) => {
    e.stopPropagation();
    try {
      const res = await axios.put(`${API_URL}/api/auth/toggle-pin`, { userId: currentUser.id || currentUser._id, chatId: targetId });
      setCurrentUser(prev => ({ ...prev, pinnedChats: res.data.pinnedChats }));
      localStorage.setItem("user", JSON.stringify({ ...currentUser, pinnedChats: res.data.pinnedChats }));
    } catch {}
  };

  const toggleMuteChat = async (targetId, e) => {
    e.stopPropagation();
    try {
      const res = await axios.put(`${API_URL}/api/auth/toggle-mute`, { userId: currentUser.id || currentUser._id, chatId: targetId });
      setCurrentUser(prev => ({ ...prev, mutedChats: res.data.mutedChats }));
      localStorage.setItem("user", JSON.stringify({ ...currentUser, mutedChats: res.data.mutedChats }));
    } catch {}
  };

  const fireMessageEdit = () => {
    if(!editInput.trim()) return;
    socket.emit("edit_message", {
      messageId: editingMessage._id,
      newText: editInput,
      receiver: selectedUser?.name || null,
      groupId: selectedGroup?._id || null
    });
    setEditingMessage(null);
    setEditInput("");
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append("avatar", file); fd.append("userId", currentUser.id || currentUser._id);
    try {
      const res = await axios.put(`${API_URL}/api/auth/update-avatar`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      const updated = { ...currentUser, avatar: res.data.avatar };
      localStorage.setItem("user", JSON.stringify(updated));
      setCurrentUser(updated);
    } catch {}
  };

  const sendMediaFile = async (file) => {
    if (!selectedUser && !selectedGroup) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await axios.post(`${API_URL}/api/messages/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      const { mediaUrl, mediaType } = res.data;
      if (selectedUser) {
        socket.emit("send_message", { sender: currentUser.name, receiver: selectedUser.name, text: "", mediaUrl, mediaType, replyTo: replyTo ? replyTo._id : null });
      } else if (selectedGroup) {
        socket.emit("send_group_message", { groupId: selectedGroup._id, sender: currentUser.name, text: "", mediaUrl, mediaType });
      }
      setReplyTo(null);
    } catch {}
    setUploading(false);
  };

  const handleFileChange = (e) => { const f = e.target.files[0]; if (f) { sendMediaFile(f); e.target.value = ""; } };

  const beginVoiceRecord = async () => {
    if (!navigator.mediaDevices) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorderRef.current.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await sendMediaFile(new File([blob], `voice_${Date.now()}.webm`, { type: "audio/webm" }));
        stream.getTracks().forEach(t => t.stop());
      };
      recorderRef.current.start();
      setIsRecording(true); setRecordingDuration(0);
      durationTimerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } catch {}
  };

  const stopVoiceRecord = (send = true) => {
    clearInterval(durationTimerRef.current); setIsRecording(false);
    if (!recorderRef.current) return;
    if (!send) recorderRef.current.onstop = () => { audioChunksRef.current = []; };
    recorderRef.current.stop();
  };

  const fmtDur = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`;

  const handleReaction = (messageId, emoji) => {
    if (!selectedUser) return;
    socket.emit("react_message", { messageId, user: currentUser.name, emoji, receiver: selectedUser.name });
    setMessages(prev => prev.map(m => {
      if (m._id !== messageId) return m;
      let rxs = m.reactions ? [...m.reactions] : [];
      const ei = rxs.findIndex(r => r.user === currentUser.name && r.emoji === emoji);
      if (ei > -1) rxs.splice(ei, 1);
      else {
        const ai = rxs.findIndex(r => r.user === currentUser.name);
        if (ai > -1) rxs[ai] = { ...rxs[ai], emoji };
        else rxs.push({ user: currentUser.name, emoji });
      }
      return { ...m, reactions: rxs };
    }));
  };

  const sendGroupMessage = () => {
    if (!groupMessage.trim() || !selectedGroup) return;
    socket.emit("send_group_message", { groupId: selectedGroup._id, sender: currentUser.name, text: groupMessage });
    socket.emit("group_stop_typing", { groupId: selectedGroup._id });
    setGroupMessage("");
  };

  const handleTyping = (e) => {
    setInputMessage(e.target.value);
    if (!selectedUser) return;
    socket.emit("typing", { sender: currentUser.name, receiver: selectedUser.name });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => socket.emit("stop_typing", { sender: currentUser.name, receiver: selectedUser.name }), 1000);
  };

  const handleGroupTyping = (e) => {
    setGroupMessage(e.target.value);
    if (!selectedGroup) return;
    socket.emit("group_typing", { groupId: selectedGroup._id, sender: currentUser.name });
    clearTimeout(groupTypingTimeoutRef.current);
    groupTypingTimeoutRef.current = setTimeout(() => socket.emit("group_stop_typing", { groupId: selectedGroup._id }), 1000);
  };

  const deleteForMe = async (id) => {
    try {
      await axios.put(`${API_URL}/api/messages/${id}/delete-for-me`, { username: currentUser.name });
      setMessages(prev => prev.map(m => m._id === id ? { ...m, deletedFor: [...(m.deletedFor || []), currentUser.name] } : m));
    } catch (err) {
      console.error("Failed to delete message locally:", err);
    }
  };

  const deleteForEveryone = async (id) => {
    if (!selectedUser) return;
    socket.emit("delete_message", { id, receiver: selectedUser.name });
    setMessages(prev => prev.filter(m => m._id !== id));
  };

  const createGroup = async () => {
    if (!groupName.trim() || !selectedMembers.length) return;
    try {
      const res = await axios.post(`${API_URL}/api/groups`, { name: groupName, members: [...selectedMembers, currentUser.name], createdBy: currentUser.name });
      setGroups(prev => [...prev, res.data]);
      setGroupName(""); setSelectedMembers([]); setShowCreateGroup(false);
    } catch (err) {
      console.error("Failed to create group", err);
      alert(err.response?.data?.message || "Failed to create group");
    }
  };

  const toggleMember = (name) => setSelectedMembers(prev => prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]);
  const visibleMessages = messages.filter(m => !m.deletedFor?.includes(currentUser.name));
  const scrollToMsg = (id) => { const el = document.getElementById(`msg-${id}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); };

  const renderMedia = (msg) => {
    if (!msg.mediaUrl) return null;
    const url = `${API_URL}${msg.mediaUrl}`;
    if (msg.mediaType === "image") return <img src={url} alt="media" onClick={() => window.open(url,"_blank")} />;
    if (msg.mediaType === "video") return <video controls><source src={url} /></video>;
    if (msg.mediaType === "audio" || url.endsWith(".webm")) return <audio controls src={url} />;
    return null;
  };

  const renderReactions = (msg) => {
    if (!msg.reactions?.length) return null;
    const counts = msg.reactions.reduce((a, c) => { a[c.emoji] = (a[c.emoji] || 0) + 1; return a; }, {});
    return (
      <div className="rx-line">
        {Object.entries(counts).map(([emoji, count]) => {
          const hit = msg.reactions.some(r => r.user === currentUser.name && r.emoji === emoji);
          return (
            <div key={emoji} className={`rx-pill ${hit ? "hit" : ""}`} onClick={() => handleReaction(msg._id, emoji)}>
              <span>{emoji}</span>
              <span style={{fontSize:11,color:"var(--text2)"}}>{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAvatar = (name, avatarPath, size = 40) => {
    const color = getColor(name);
    const style = {
      width: size, height: size, borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.325, fontWeight: 600, flexShrink: 0,
      background: color + "22", color
    };
    return avatarPath
      ? <img src={`${API_URL}${avatarPath}`} alt={name} style={{...style, objectFit:"cover"}} />
      : <div style={style}>{getInitials(name)}</div>;
  };

  const activeContact = selectedUser || selectedGroup;
  const isOnline = selectedUser && onlineUsers.includes(selectedUser.name);
  const summaryKey = selectedUser ? `user:${selectedUser._id || selectedUser.name}` : null;
  const pendingSummaryMessages = selectedUser
    ? messages.filter((message) => {
        const isUnread = !message.seen;
        const fromPeer = message.sender === selectedUser.name;
        const alreadySummarized = (summarizedMessageIds[summaryKey] || []).includes(message._id);
        return isUnread && fromPeer && !alreadySummarized;
      })
    : [];
  const shouldShowSummaryButton = selectedUser && pendingSummaryMessages.length > 15;
  
  const sortChats = (list) => {
    return [...list].sort((a, b) => {
      const aPinned = currentUser?.pinnedChats?.includes(a._id || a.name) ? 1 : 0;
      const bPinned = currentUser?.pinnedChats?.includes(b._id || b.name) ? 1 : 0;
      return bPinned - aPinned;
    });
  };

  const filteredUsers = sortChats(users.filter(u => u.name.toLowerCase().includes(search.toLowerCase())));
  const filteredGroups = sortChats(groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase())));

const handleLogout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  if (currentUser) {
    socket.emit("logout_user", currentUser.name);
  }

  navigate("/login");
};

  const handleSummarizeMessages = () => {
    if (!selectedUser || pendingSummaryMessages.length <= 15) return;

    const nextSummary = buildMessageSummary(pendingSummaryMessages);
    setSummaryText(nextSummary);
    setSummarizedMessageIds((prev) => ({
      ...prev,
      [summaryKey]: [
        ...(prev[summaryKey] || []),
        ...pendingSummaryMessages.map((message) => message._id)
      ]
    }));
  };

  return (
    <div className="app">
      <style>{styles}</style>

      {isMobileView && (
        <div className={`mobile-backdrop ${showMobileSidebar ? "open" : ""}`} onClick={() => setShowMobileSidebar(false)} />
      )}

      {uploading && (
        <div className="uploading">
          <div className="uload-spinner"></div>
        </div>
      )}

      {isIncomingCall && (
        <CallModal
          callerName={callerName}
          isVideo={callType === "video"}
          onAccept={answerIncomingCall}
          onReject={rejectOrHangupCall}
        />
      )}

      {callingState !== "idle" && !isIncomingCall && (
        <ActiveCall
          localStream={localStreamState}
          remoteStream={remoteStreamState}
          callState={callingState}
          isVideo={callType === "video"}
          isMuted={isMuted}
          isCamOff={isCameraOff}
          onMute={toggleMute}
          onCam={toggleCamera}
          onHangUp={rejectOrHangupCall}
          peerName={selectedUser?.name || callerName}
          callDuration={callDuration}
        />
      )}

      {/* SIDEBAR */}
      <div className={`sidebar ${isMobileView && showMobileSidebar ? "open" : ""}`} style={isMobileView ? { display: mobileView === "list" ? "flex" : "none" } : undefined}>
        <div className="sidebar-top">
          <div className="brand" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="brand-dot"></div>
              <span>CHAT APP</span>
            </div>
            {isMobileView && (
              <button className="mobile-nav-btn" onClick={() => setShowMobileSidebar(false)} aria-label="Close menu">✕</button>
            )}
          </div>

          <div className="tabs">
            <button className={`tab ${activeTab === "chats" ? "on" : ""}`} onClick={() => setActiveTab("chats")}>CHATS</button>
            <button className={`tab ${activeTab === "groups" ? "on" : ""}`} onClick={() => setActiveTab("groups")}>GROUPS</button>
          </div>
        </div>

        <div className="search-wrap">
          <input type="text" placeholder="Search direct messages or rooms..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="contact-list">
          {activeTab === "groups" && (
            <>
              <button className="gnewbtn" onClick={() => setShowCreateGroup(!showCreateGroup)}>
                {showCreateGroup ? "✕ Close Panel" : "＋ Create New Room"}
              </button>
              {showCreateGroup && (
                <div className="gpanel">
                  <input className="ginput" type="text" placeholder="Group Name..." value={groupName} onChange={(e) => setGroupName(e.target.value)} />
                  <div style={{maxHeight:110, overflowY:"auto", marginBottom:8}}>
                    {users.map(u => (
                      <label key={u._id} className="mcheck">
                        <input type="checkbox" checked={selectedMembers.includes(u.name)} onChange={() => toggleMember(u.name)} />
                        <span>{u.name}</span>
                      </label>
                    ))}
                  </div>
                  <button className="gcreate" onClick={createGroup}>Assemble Channels</button>
                </div>
              )}
              {filteredGroups.map(g => {
                const isPinned = currentUser?.pinnedChats?.includes(g._id);
                const isMuted = currentUser?.mutedChats?.includes(g._id);
                return (
                  <div key={g._id} className={`contact ${selectedGroup?._id === g._id ? "active" : ""}`} onClick={() => { setSelectedGroup(g); if (isMobileView) setShowMobileSidebar(false); }}>
                    {renderAvatar(g.name, null, 40)}
                    <div className="c-info">
                      <div className="c-name">
                        {g.name}
                        {isPinned && <span className="pin-indicator">📌</span>}
                        {isMuted && <span className="mute-indicator">🔇</span>}
                      </div>
                      <div className="c-sub">{g.members?.length} subscribers connected</div>
                      <div style={{display:"flex", gap:"8px", marginTop:"4px"}}>
                        <button className="chat-action-btn" onClick={(e) => togglePinChat(g._id, e)}>{isPinned ? "Unpin" : "Pin"}</button>
                        <button className="chat-action-btn" onClick={(e) => toggleMuteChat(g._id, e)}>{isMuted ? "Unmute" : "Mute"}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {activeTab === "chats" && filteredUsers.map(u => {
            const userIsOnline = onlineUsers.includes(u.name);
            const isPinned = currentUser?.pinnedChats?.includes(u.name);
            const isMuted = currentUser?.mutedChats?.includes(u.name);
            return (
              <div key={u._id} className={`contact ${selectedUser?._id === u._id ? "active" : ""}`} onClick={() => { setSelectedUser(u); if (isMobileView) { setShowMobileSidebar(false); setMobileView("chat"); } }}>
                <div className="av">
                  {renderAvatar(u.name, u.avatar, 40)}
                  <div className={`status-ring ${userIsOnline ? "online" : "offline"}`}></div>
                </div>
                <div className="c-info">
                  <div className="c-name">
                    <span>{u.statusEmoji || "💬"} {u.name}</span>
                    {isPinned && <span className="pin-indicator">📌</span>}
                    {isMuted && <span className="mute-indicator">🔇</span>}
                  </div>
                  <div className="c-sub">{u.bio || "No status bio updated."}</div>
                  <div style={{display:"flex", gap:"8px", marginTop:"4px"}}>
                    <button className="chat-action-btn" onClick={(e) => togglePinChat(u.name, e)}>{isPinned ? "Unpin" : "Pin"}</button>
                    <button className="chat-action-btn" onClick={(e) => toggleMuteChat(u.name, e)}>{isMuted ? "Unmute" : "Mute"}</button>
                  </div>
                </div>
                {unreadCounts[u.name] && <div className="badge">{unreadCounts[u.name]}</div>}
              </div>
            );
          })}
        </div>

        {/* SIDEBAR FOOTER */}
        <div className="sidebar-foot">
          <div style={{display:"flex", alignItems:"center", gap:"10px", width:"100%"}}>
            <div className="me-av">
              {renderAvatar(currentUser.name, currentUser.avatar, 36)}
              <div className="av-overlay" onClick={() => avatarInputRef.current.click()}>EDIT</div>
              <input type="file" ref={avatarInputRef} style={{display:"none"}} accept="image/*" onChange={handleAvatarUpload} />
            </div>
            <div>
              <div className="me-label">Logged Account</div>
              <div className="me-name">{currentUser.statusEmoji || "💬"} {currentUser.name}</div>
            </div>
           <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
  <button
    className="logout"
    onClick={() => setShowProfileConfig(!showProfileConfig)}
  >
    ⚙️ Profile
  </button>

  <button
    className="logout"
    onClick={handleLogout}
  >
    Logout
  </button>
</div>
          </div>

          {showProfileConfig && (
            <div className="profile-meta-panel">
              <div className="prof-row">
                <input className="prof-input" type="text" placeholder="Custom Bio Info..." value={customBio} onChange={(e) => setCustomBio(e.target.value)} />
              </div>
              <div className="prof-row">
                <input className="prof-input" type="text" placeholder="Emoji..." value={customEmoji} onChange={(e) => setCustomEmoji(e.target.value)} />
                <button className="prof-save" onClick={saveProfileSettings}>Save</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CHAT WINDOW CONTAINER */}
      {(activeContact || !isMobileView) && (
        activeContact ? (
        <div className="chat-area" style={isMobileView ? { display: mobileView === "chat" ? "flex" : "none" } : undefined}>
          <div className="chat-head">
            {isMobileView && (
              <button className="mobile-nav-btn" onClick={() => { setShowMobileSidebar(true); setMobileView("list"); }} aria-label="Back to chats">←</button>
            )}
            <div>
              <div className="head-name">{selectedGroup ? `👥 ${selectedGroup.name}` : `👤 ${selectedUser.name}`}</div>
              <div className="head-status">
                <span className={`status-dot ${selectedGroup ? "sdot-on" : isOnline ? "sdot-on" : "sdot-off"}`}></span>
                <span className={selectedGroup ? "head-online" : isOnline ? "head-online" : "head-offline"}>
                  {selectedGroup ? `${selectedGroup.members?.length} active context accounts` : isOnline ? "Online Now" : lastSeenCache[selectedUser.name] ? `Last seen: ${new Date(lastSeenCache[selectedUser.name]).toLocaleTimeString()}` : "Offline"}
                </span>
              </div>
            </div>

            {/* CALL CONTROLS DYNAMIC ACTIONS BAR PANEL */}
            {selectedUser && (
              <div style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "center" }}>
                {shouldShowSummaryButton && (
                  <button className="summary-btn" onClick={handleSummarizeMessages}>✨ Summarize</button>
                )}
                {callingState === "idle" && (
                  <>
                    <button className="ibtn" title="Voice Call" onClick={() => initiateCall(false)}>📞</button>
                    <button className="ibtn" title="Video Call" onClick={() => initiateCall(true)}>📹</button>
                  </>
                )}
              </div>
            )}
          </div>

          {summaryText && (
            <div className="summary-card">
              <div className="summary-title">AI summary</div>
              <div className="summary-body">{summaryText}</div>
            </div>
          )}

          {/* MESSAGES LAYER ELEMENTS */}
          <div className="msgs">
            {selectedUser ? (
              visibleMessages.map(msg => {
                const isMine = msg.sender === currentUser.name;
                return (
                  <div key={msg._id} id={`msg-${msg._id}`} className={`mrow ${isMine ? "mine" : "theirs"}`}>
                    <div className="bubble">
                      {msg.replyTo && (
                        <div className="rquote" onClick={() => scrollToMsg(msg.replyTo._id || msg.replyTo)}>
                          <div className="rq-sender">{msg.replyTo.sender || "Message Trace"}</div>
                          <div>{msg.replyTo.text || "📷 Attachment File Link"}</div>
                        </div>
                      )}
                      <div>{msg.text}</div>
                      {renderMedia(msg)}
                      {renderReactions(msg)}
                    </div>
                    <div className="meta">
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      {msg.isEdited && <span className="edited-flag">(edited)</span>}
                      {isMine && <span className={`tick ${msg.seen ? "seen" : ""}`}>✓</span>}
                    </div>

                    <div className="hactions">
                      <div className="hact-row">
                        <div className="hact-emojis">
                          {POPULAR_EMOJIS.map(e => <button key={e} onClick={() => handleReaction(msg._id, e)}>{e}</button>)}
                        </div>
                      </div>
                      <div className="hact-btns">
                        <button className="hbtn" onClick={() => setReplyTo(msg)}>Reply</button>
                        {isMine && <button className="hbtn" onClick={() => { setEditingMessage(msg); setEditInput(msg.text); }}>Edit</button>}
                        <button className="hbtn danger" onClick={() => deleteForMe(msg._id)}>Delete for me</button>
                        {isMine && <button className="hbtn danger" onClick={() => deleteForEveryone(msg._id)}>Delete for everyone</button>}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              groupMessages.map(msg => {
                const isMine = msg.sender === currentUser.name;
                return (
                  <div key={msg._id} className={`mrow ${isMine ? "mine" : "theirs"}`}>
                    {!isMine && <span className="sender-label" style={{color: getColor(msg.sender)}}>{msg.sender}</span>}
                    <div className="bubble">
                      <div>{msg.text}</div>
                      {renderMedia(msg)}
                    </div>
                    <div className="meta">
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      {msg.isEdited && <span className="edited-flag">(edited)</span>}
                    </div>
                    {isMine && (
                      <div className="hactions" style={{marginTop: "2px"}}>
                        <button className="hbtn" onClick={() => { setEditingMessage(msg); setEditInput(msg.text); }}>Edit</button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={selectedUser ? messagesEndRef : groupMessagesEndRef} />
          </div>

          {/* TYPING INDICATION WRAPPERS */}
          {typingUser && <div className="typing"><span>{typingUser} is typing</span><div className="typing-dots"><span></span><span></span><span></span></div></div>}
          {groupTypingUser && <div className="typing"><span>{groupTypingUser} typing in room</span><div className="typing-dots"><span></span><span></span><span></span></div></div>}

          {/* BOTTOM INTERACTION INPUT BAR CONTROL PACKS */}
          <div className="footer">
            {replyTo && (
              <div className="reply-bar">
                <div className="rbar-info">
                  <div className="rbar-title">Replying to message payload</div>
                  <div className="rbar-text">{replyTo.text || "📷 Attachment File URL Context"}</div>
                </div>
                <button className="rbar-cancel" onClick={() => setReplyTo(null)}>✕</button>
              </div>
            )}

            {editingMessage && (
              <div className="reply-bar" style={{background: "var(--bg3)"}}>
                <div className="rbar-info" style={{borderColor: "var(--teal)"}}>
                  <div className="rbar-title" style={{color: "var(--teal)"}}>Editing Message Content</div>
                  <input className="msginput" style={{marginTop:"4px", padding:"6px"}} value={editInput} onChange={(e) => setEditInput(e.target.value)} />
                </div>
                <div style={{display:"flex", gap:"6px"}}>
                  <button className="hbtn" onClick={fireMessageEdit}>Update</button>
                  <button className="hbtn danger" onClick={() => setEditingMessage(null)}>Cancel</button>
                </div>
              </div>
            )}

            <div className="ibar">
              <input type="file" ref={fileInputRef} style={{display:"none"}} onChange={handleFileChange} />
              <button className="ibtn" onClick={() => fileInputRef.current.click()}>📎</button>

              {isRecording ? (
                <div className="recbar">
                  <div><span className="recdot"></span>Voice track recording: {fmtDur(recordingDuration)}</div>
                  <div className="recbtns">
                    <button className="hbtn danger" onClick={() => stopVoiceRecord(false)}>Cancel</button>
                    <button className="hbtn" style={{background:"var(--green)", color:"#fff", border:"none"}} onClick={() => stopVoiceRecord(true)}>Send Audio</button>
                  </div>
                </div>
              ) : (
                <>
                  <button className="ibtn" onClick={beginVoiceRecord}>🎙️</button>
                  <input 
                    className="msginput" 
                    type="text" 
                    placeholder="Enter message details payload..." 
                    value={selectedUser ? inputMessage : groupMessage} 
                    onChange={selectedUser ? handleTyping : handleGroupTyping} 
                    onKeyDown={(e) => e.key === "Enter" && (selectedUser ? sendMessage() : sendGroupMessage())} 
                  />
                  <button className="sendbtn" onClick={selectedUser ? sendMessage : sendGroupMessage}>➔</button>
                </>
              )}
            </div>
          </div>
        </div>
        ) : (
          <div className="empty">
            <div className="empty-icon">📡</div>
            <div className="empty-title">No Active Stream Target Selected</div>
            <div className="empty-sub">Choose a room connection listing from the primary sidebar directory listing array.</div>
          </div>
        )
      )}
    </div>
  );
}