"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaPhoneSlash,
  FaPaperPlane,
  FaFilter,
  FaCommentAlt,
  FaFlag,
  FaTimes,
  FaShieldAlt,
  FaChevronDown,
} from "react-icons/fa";

interface Message {
  id: string;
  sender: "you" | "stranger" | "system";
  text: string;
  time: string;
}

const SOCKET_SERVER_URL = "http://localhost:5000";

const STRANGER_PRESETS = [
  { name: "Alex", country: "🇺🇸 United States", interests: ["Gaming", "Coding"] },
  { name: "Sofia", country: "🇪🇸 Spain", interests: ["Music", "Travel"] },
  { name: "Yuki", country: "🇯🇵 Japan", interests: ["Anime", "Tech"] },
  { name: "Liam", country: "🇬🇧 UK", interests: ["Football", "Movies"] },
  { name: "Aarav", country: "🇮🇳 India", interests: ["Coding", "Cricket"] },
];

const INTEREST_OPTIONS = [
  "🎮 Gaming",
  "🎵 Music",
  "💻 Coding",
  "🎬 Movies",
  "⚽ Sports",
  "✈️ Travel",
  "🎨 Art",
  "📚 Reading",
];

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function VideoChat() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Media states
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [error, setError] = useState("");

  // Room & Connection states
  const [matchState, setMatchState] = useState<"searching" | "connected" | "ended">("searching");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isRealPeer, setIsRealPeer] = useState(false);
  const [stranger, setStranger] = useState(STRANGER_PRESETS[0]);
  const [searchTime, setSearchTime] = useState(0);

  // UI States
  const [showChat, setShowChat] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["🎮 Gaming", "💻 Coding"]);

  // Messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // 1. Initialize local camera & Socket connection
  useEffect(() => {
    const startMediaAndSocket = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        setStream(mediaStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }

        // Initialize Socket.io connection
        const newSocket = io(SOCKET_SERVER_URL, {
          transports: ["websocket", "polling"],
          timeout: 5000,
        });

        socketRef.current = newSocket;

        newSocket.on("connect", () => {
          console.log("Connected to Chatgle Backend:", newSocket.id);
          newSocket.emit("join_queue", { mode: "video", interests: selectedInterests });
        });

        // Backend matchmaking events
        newSocket.on("match_found", async (data) => {
          console.log("Real Match Found!", data);
          setRoomId(data.roomId);
          setIsRealPeer(true);
          setStranger({
            name: data.partnerInfo.name,
            country: data.partnerInfo.country,
            interests: data.partnerInfo.interests,
          });
          setMatchState("connected");

          setMessages([
            {
              id: Date.now().toString(),
              sender: "system",
              text: `Connected to real user (${data.partnerInfo.country})! Say hi! 👋`,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);

          // Setup WebRTC Peer Connection
          setupWebRTC(data.roomId, data.isInitiator, mediaStream);
        });

        newSocket.on("receive_message", (msg) => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              sender: "stranger",
              text: msg.text,
              time: msg.time,
            },
          ]);
        });

        newSocket.on("partner_disconnected", () => {
          cleanupWebRTC();
          setMatchState("ended");
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              sender: "system",
              text: "Partner disconnected.",
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        });

        newSocket.on("connect_error", () => {
          console.log("Backend offline, running in demo mode.");
        });

      } catch (err) {
        console.error(err);
        setError("Camera/microphone permission denied. Please allow access.");
      }
    };

    startMediaAndSocket();

    return () => {
      cleanupWebRTC();
      if (socketRef.current) socketRef.current.disconnect();
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // WebRTC Setup Helper
  const setupWebRTC = async (rId: string, isInitiator: boolean, localStream: MediaStream) => {
    cleanupWebRTC();

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Add local tracks to peer connection
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // Receive remote tracks
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice_candidate", {
          roomId: rId,
          candidate: event.candidate,
        });
      }
    };

    // Signaling handlers
    if (socketRef.current) {
      socketRef.current.off("webrtc_offer");
      socketRef.current.off("webrtc_answer");
      socketRef.current.off("ice_candidate");

      socketRef.current.on("webrtc_offer", async ({ offer }) => {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit("webrtc_answer", { roomId: rId, answer });
      });

      socketRef.current.on("webrtc_answer", async ({ answer }) => {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socketRef.current.on("ice_candidate", async ({ candidate }) => {
        if (candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });
    }

    // If initiator, create Offer
    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit("webrtc_offer", { roomId: rId, offer });
    }
  };

  const cleanupWebRTC = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  // Searching timer & Demo simulation fallback
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (matchState === "searching") {
      setSearchTime(0);
      interval = setInterval(() => {
        setSearchTime((prev) => prev + 1);
      }, 1000);

      // Join socket queue if connected
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("join_queue", { mode: "video", interests: selectedInterests });
      }

      // Demo fallback match after 3 seconds if no socket partner connects
      const timeout = setTimeout(() => {
        if (!isRealPeer && matchState === "searching") {
          const randomStranger = STRANGER_PRESETS[Math.floor(Math.random() * STRANGER_PRESETS.length)];
          setStranger(randomStranger);
          setMatchState("connected");
          setMessages([
            {
              id: "1",
              sender: "system",
              text: `Connected with ${randomStranger.name} (${randomStranger.country})!`,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);

          setTimeout(() => {
            setIsTyping(true);
            setTimeout(() => {
              setIsTyping(false);
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  sender: "stranger",
                  text: `Hey there! 👋 Nice to meet you!`,
                  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
              ]);
            }, 1800);
          }, 1000);
        }
      }, 3000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [matchState]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Handlers
  const handleNextStranger = () => {
    cleanupWebRTC();
    setIsRealPeer(false);
    setRoomId(null);
    setMatchState("searching");
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("next_stranger", { mode: "video", interests: selectedInterests });
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || matchState !== "connected") return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "you",
      text: inputMessage,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMessage]);

    // Send via Socket if connected to real peer
    if (isRealPeer && roomId && socketRef.current) {
      socketRef.current.emit("send_message", { roomId, text: inputMessage });
    } else {
      // Demo simulated response
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          const replies = [
            "That's awesome! Tell me more ✨",
            "Haha nice! Where are you located?",
            "Cool! I love that too 🔥",
            "Great chatting with you! 😊",
          ];
          const replyText = replies[Math.floor(Math.random() * replies.length)];
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              sender: "stranger",
              text: replyText,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }, 1800);
      }, 800);
    }

    setInputMessage("");
  };

  const toggleMic = () => {
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMicOn((prev) => !prev);
  };

  const toggleCamera = () => {
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCameraOn((prev) => !prev);
  };

  const endCall = () => {
    cleanupWebRTC();
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setMatchState("ended");
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  return (
    <div className="relative mx-auto max-w-7xl px-2">
      {/* Header Banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-400">
            <FaShieldAlt className="text-xl" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Chatgle Real-Time Video Room</h2>
            <p className="text-xs text-gray-400">WebRTC Encrypted Peer-to-Peer Connection</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilterModal(true)}
            className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20 cursor-pointer"
          >
            <FaFilter />
            <span>Interests ({selectedInterests.length})</span>
          </button>

          <button
            onClick={() => setShowChat(!showChat)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition cursor-pointer ${
              showChat
                ? "border-cyan-400 bg-cyan-400 text-black"
                : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            <FaCommentAlt />
            <span>Text Chat {showChat ? "On" : "Off"}</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-400 backdrop-blur-lg"
        >
          ⚠️ {error}
        </motion.div>
      )}

      {/* 📹 LARGE CAMERA FEEDS (FULL WIDTH, 550px) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* STRANGER VIDEO FEED */}
        <div className="relative flex h-[480px] sm:h-[550px] items-center justify-center overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-950/90 via-slate-950 to-cyan-950/90 shadow-2xl backdrop-blur-2xl">
          
          {/* Top Bar Overlay */}
          <div className="absolute left-5 top-5 z-10 flex items-center gap-2.5 rounded-full border border-white/15 bg-black/70 px-5 py-2 text-sm font-semibold backdrop-blur-md">
            <span
              className={`h-3 w-3 rounded-full ${
                matchState === "connected" ? "bg-green-400 animate-pulse" : "bg-yellow-400 animate-ping"
              }`}
            />
            <span className="text-white text-sm font-bold">
              {matchState === "connected" ? stranger.name : "Searching Stranger..."}
            </span>
            {matchState === "connected" && (
              <span className="ml-1 text-gray-300 text-xs">{stranger.country}</span>
            )}
          </div>

          {/* Report button */}
          {matchState === "connected" && (
            <button
              onClick={() => setShowReportModal(true)}
              className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-gray-400 transition hover:bg-red-500/20 hover:text-red-400 backdrop-blur-md cursor-pointer"
              title="Report User"
            >
              <FaFlag size={14} />
            </button>
          )}

          {/* State 1: Searching with Radar Pulse */}
          {matchState === "searching" && (
            <div className="flex flex-col items-center justify-center text-center p-6">
              <div className="relative flex items-center justify-center mb-8">
                <motion.div
                  animate={{ scale: [1, 2.3, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute h-44 w-44 rounded-full border-2 border-cyan-400/40 bg-cyan-400/10"
                />
                <motion.div
                  animate={{ scale: [1, 1.7, 1], opacity: [0.8, 0.2, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                  className="absolute h-32 w-32 rounded-full border border-purple-500/40 bg-purple-500/10"
                />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 text-4xl shadow-xl shadow-cyan-500/30">
                  ⚡
                </div>
              </div>

              <h3 className="text-2xl font-black bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                Matching with Stranger...
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                Searching real online users • {searchTime}s
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-sm">
                {selectedInterests.map((interest) => (
                  <span key={interest} className="rounded-full bg-cyan-400/10 border border-cyan-400/20 px-3.5 py-1 text-xs text-cyan-300">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* State 2: Connected */}
          {matchState === "connected" && (
            <div className="relative flex h-full w-full flex-col items-center justify-center">
              {/* Remote WebRTC Video Feed */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
              {!isRealPeer && (
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <div className="flex h-36 w-36 items-center justify-center rounded-full border-2 border-cyan-400/30 bg-cyan-400/10 text-7xl shadow-2xl backdrop-blur-xl">
                    👤
                  </div>
                  <p className="mt-4 text-base font-semibold text-cyan-300">
                    {stranger.name} Video Live
                  </p>
                </div>
              )}
            </div>
          )}

          {/* State 3: Call Ended */}
          {matchState === "ended" && (
            <div className="text-center p-6">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-3xl">
                📵
              </div>
              <h3 className="text-xl font-bold text-white">Call Disconnected</h3>
              <button
                onClick={handleNextStranger}
                className="mt-4 rounded-full bg-cyan-400 px-8 py-3 text-sm font-bold text-black transition hover:bg-cyan-300 cursor-pointer shadow-lg shadow-cyan-400/20"
              >
                Start New Match
              </button>
            </div>
          )}
        </div>

        {/* YOUR VIDEO FEED */}
        <div className="relative h-[480px] sm:h-[550px] overflow-hidden rounded-3xl border border-cyan-500/30 bg-slate-950 shadow-2xl">
          <div className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-5 py-2 text-sm font-semibold backdrop-blur-md">
            <span className="h-3 w-3 rounded-full bg-cyan-400" />
            <span className="text-white font-bold">You (Your Camera)</span>
          </div>

          {cameraOn ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover transform -scale-x-100"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="text-7xl mb-4">🙈</div>
                <p className="text-base font-semibold text-gray-400">Camera is Turned Off</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CONTROL BAR */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 rounded-3xl border border-white/10 bg-black/50 p-4 backdrop-blur-2xl">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleMic}
          className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition cursor-pointer ${
            micOn
              ? "border-white/10 bg-white/10 text-white hover:bg-white/20"
              : "border-red-500/40 bg-red-500/20 text-red-400"
          }`}
          title={micOn ? "Mute Microphone" : "Unmute Microphone"}
        >
          {micOn ? <FaMicrophone size={18} /> : <FaMicrophoneSlash size={18} />}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleCamera}
          className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition cursor-pointer ${
            cameraOn
              ? "border-white/10 bg-white/10 text-white hover:bg-white/20"
              : "border-red-500/40 bg-red-500/20 text-red-400"
          }`}
          title={cameraOn ? "Turn Camera Off" : "Turn Camera On"}
        >
          {cameraOn ? <FaVideo size={18} /> : <FaVideoSlash size={18} />}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleNextStranger}
          className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-purple-500 px-9 py-4 text-base font-bold text-black shadow-xl shadow-cyan-400/25 transition hover:brightness-110 cursor-pointer"
        >
          <span className="text-xl">⏭️</span>
          <span>Next Stranger</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={endCall}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500 text-white shadow-lg shadow-red-500/30 transition hover:bg-red-600 cursor-pointer"
          title="End Call"
        >
          <FaPhoneSlash size={18} />
        </motion.button>
      </div>

      {/* COMPACT IN-CALL TEXT CHAT PANEL */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-6 flex flex-col rounded-3xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-3.5">
              <div className="flex items-center gap-2.5">
                <FaCommentAlt className="text-cyan-400 text-sm" />
                <h3 className="font-bold text-white text-sm">Live In-Call Texting</h3>
                <span className="rounded-full bg-cyan-400/10 px-3 py-0.5 text-xs text-cyan-300">
                  {matchState === "connected" ? `Connected with ${stranger.name}` : "Waiting for match"}
                </span>
              </div>

              <button
                onClick={() => setShowChat(false)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition cursor-pointer"
              >
                <span>Hide Chat</span>
                <FaChevronDown size={11} />
              </button>
            </div>

            <div className="h-[160px] overflow-y-auto p-4 space-y-2.5 scrollbar-thin scrollbar-thumb-white/10">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center text-xs text-gray-500">
                  No messages yet. Type something below to start texting! 💬
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === "you"
                        ? "items-end"
                        : msg.sender === "system"
                        ? "items-center"
                        : "items-start"
                    }`}
                  >
                    {msg.sender === "system" ? (
                      <span className="my-0.5 rounded-full bg-white/5 px-3 py-0.5 text-[11px] text-gray-400">
                        {msg.text}
                      </span>
                    ) : (
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 text-xs leading-relaxed ${
                          msg.sender === "you"
                            ? "bg-cyan-400 text-black font-medium rounded-br-none shadow-md"
                            : "bg-white/10 text-white rounded-bl-none border border-white/10"
                        }`}
                      >
                        <p>{msg.text}</p>
                        <span
                          className={`block text-[9px] mt-0.5 text-right ${
                            msg.sender === "you" ? "text-black/60" : "text-gray-400"
                          }`}
                        >
                          {msg.time}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}

              {isTyping && (
                <div className="flex items-center gap-2 text-gray-400 text-xs pl-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce delay-150" />
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce delay-300" />
                  <span className="text-[11px] text-gray-400">{stranger.name} is typing...</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="border-t border-white/10 p-3 bg-black/30 flex gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={matchState === "connected" ? "Type a quick message..." : "Connect to start texting..."}
                disabled={matchState !== "connected"}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || matchState !== "connected"}
                className="flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-bold text-black transition hover:bg-cyan-300 disabled:opacity-40 cursor-pointer shadow-lg shadow-cyan-400/20"
              >
                <span>Send</span>
                <FaPaperPlane size={11} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILTER INTERESTS MODAL */}
      <AnimatePresence>
        {showFilterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0b0f24] p-6 shadow-2xl text-white"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FaFilter className="text-cyan-400" /> Match Preferences
                </h3>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>

              <p className="mt-4 text-xs text-gray-400">
                Select topics you'd like to match with people about:
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((interest) => {
                  const isSelected = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition cursor-pointer border ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-400/20 text-cyan-300"
                          : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="rounded-full bg-cyan-400 px-6 py-2 text-xs font-bold text-black transition hover:bg-cyan-300 cursor-pointer"
                >
                  Save & Apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REPORT USER MODAL */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm rounded-3xl border border-red-500/20 bg-[#0b0f24] p-6 shadow-2xl text-white"
            >
              <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                <FaFlag /> Report Stranger
              </h3>
              <p className="mt-2 text-xs text-gray-400">
                Help keep Chatgle safe. What is the issue?
              </p>

              <div className="mt-4 space-y-2 text-xs">
                {["Inappropriate Behavior", "Spam or Advertising", "Abusive Language", "Other"].map(
                  (reason) => (
                    <button
                      key={reason}
                      onClick={() => {
                        setShowReportModal(false);
                        handleNextStranger();
                      }}
                      className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-red-500/10 hover:border-red-500/30 transition cursor-pointer"
                    >
                      {reason}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() => setShowReportModal(false)}
                className="mt-4 w-full text-center text-xs text-gray-500 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}