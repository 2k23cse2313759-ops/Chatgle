"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaPhoneSlash,
  FaPaperPlane,
  FaForward,
} from "react-icons/fa";

interface Message {
  id: string;
  sender: "you" | "stranger" | "system";
  text: string;
  time: string;
}

const SOCKET_SERVER_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

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

  // Connection & Room states
  const [matchState, setMatchState] = useState<"searching" | "connected" | "ended">("searching");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isRealPeer, setIsRealPeer] = useState(false);
  const [partnerName, setPartnerName] = useState("Stranger");
  const [searchSeconds, setSearchSeconds] = useState(0);

  // Chat Messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");

  // 1. Initialize local camera (Only Video & Audio)
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const startMediaAndSocket = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        activeStream = mediaStream;
        setStream(mediaStream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }

        // Initialize Socket.io connection
        const newSocket = io(SOCKET_SERVER_URL, {
          transports: ["websocket", "polling"],
          timeout: 7000,
        });

        socketRef.current = newSocket;

        newSocket.on("connect", () => {
          console.log("Connected to Chatgle server:", newSocket.id);
          newSocket.emit("join_queue", { mode: "video" });
        });

        // Match found event
        newSocket.on("match_found", (data) => {
          setRoomId(data.roomId);
          setIsRealPeer(true);
          setPartnerName("Stranger");
          setMatchState("connected");

          setMessages([
            {
              id: Date.now().toString(),
              sender: "system",
              text: "You are now chatting with a random stranger.",
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);

          // Setup WebRTC Peer Connection
          setupWebRTC(data.roomId, data.isInitiator, mediaStream);
        });

        // Receive text messages from real partner
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

        // Partner disconnected
        newSocket.on("partner_disconnected", () => {
          cleanupWebRTC();
          setMatchState("ended");
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              sender: "system",
              text: "Stranger has disconnected.",
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        });

      } catch (err) {
        console.error(err);
        setError("Camera and Microphone access is required. Please check your browser permissions.");
      }
    };

    startMediaAndSocket();

    return () => {
      cleanupWebRTC();
      if (socketRef.current) socketRef.current.disconnect();
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // WebRTC Setup Helper
  const setupWebRTC = async (rId: string, isInitiator: boolean, localStream: MediaStream) => {
    cleanupWebRTC();

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice_candidate", {
          roomId: rId,
          candidate: event.candidate,
        });
      }
    };

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
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  // Searching timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (matchState === "searching") {
      setSearchSeconds(0);
      interval = setInterval(() => {
        setSearchSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [matchState]);

  // Auto-scroll chat to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Next / Skip Stranger
  const handleNextStranger = () => {
    cleanupWebRTC();
    setIsRealPeer(false);
    setRoomId(null);
    setMessages([]);
    setMatchState("searching");

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("next_stranger", { mode: "video" });
    }
  };

  // Send message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || matchState !== "connected") return;

    const text = inputMessage.trim();
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "you",
      text,
      time,
    };

    setMessages((prev) => [...prev, newMessage]);

    if (isRealPeer && roomId && socketRef.current) {
      socketRef.current.emit("send_message", { roomId, text });
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

  return (
    <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-4">
      {/* Error alert */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* Main Container: Left Videos + Right Chat */}
      <div className="flex flex-col gap-5 lg:flex-row">
        
        {/* LEFT SECTION: VIDEOS + CONTROLS (FLEX-1) */}
        <div className="flex flex-1 flex-col">
          {/* VIDEO FRAMES GRID (LARGE & PROMINENT) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            
            {/* STRANGER VIDEO FRAME */}
            <div className="relative flex h-[380px] sm:h-[480px] lg:h-[530px] items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-[#0c0d14] shadow-xl">
              
              {/* Status Tag */}
              <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/75 px-4 py-1.5 text-xs font-semibold backdrop-blur-md">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    matchState === "connected" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                  }`}
                />
                <span className="text-white">
                  {matchState === "connected" ? partnerName : "Searching..."}
                </span>
              </div>

              {/* State 1: Searching State */}
              {matchState === "searching" && (
                <div className="flex flex-col items-center justify-center text-center p-6">
                  <div className="mb-4 h-12 w-12 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                  <h3 className="text-lg font-semibold text-white">
                    Looking for a stranger...
                  </h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    Connecting you with someone online ({searchSeconds}s)
                  </p>
                </div>
              )}

              {/* State 2: Connected (Remote Stream) */}
              {matchState === "connected" && (
                <div className="relative h-full w-full">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                  />
                  {!isRealPeer && (
                    <div className="flex h-full w-full flex-col items-center justify-center text-zinc-500">
                      <div className="text-6xl mb-2">👤</div>
                      <p className="text-sm">Connecting video stream...</p>
                    </div>
                  )}
                </div>
              )}

              {/* State 3: Disconnected */}
              {matchState === "ended" && (
                <div className="text-center p-6">
                  <p className="text-base font-semibold text-zinc-300">Call Ended</p>
                  <button
                    onClick={handleNextStranger}
                    className="mt-3 rounded-lg bg-cyan-500 px-6 py-2 text-xs font-bold text-black transition hover:bg-cyan-400 cursor-pointer"
                  >
                    Find Next Stranger
                  </button>
                </div>
              )}
            </div>

            {/* YOUR VIDEO FRAME */}
            <div className="relative h-[380px] sm:h-[480px] lg:h-[530px] overflow-hidden rounded-2xl border border-zinc-800 bg-[#0c0d14] shadow-xl">
              <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/75 px-4 py-1.5 text-xs font-semibold backdrop-blur-md">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                <span className="text-white">You</span>
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
                <div className="flex h-full items-center justify-center text-zinc-500">
                  <div className="text-center">
                    <div className="text-5xl mb-2">🙈</div>
                    <p className="text-xs font-medium">Camera is off</p>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* CONTROL BAR */}
          <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-[#11131c] p-3">
            {/* Mic Toggle */}
            <button
              onClick={toggleMic}
              className={`flex h-12 w-12 items-center justify-center rounded-xl border transition cursor-pointer ${
                micOn
                  ? "border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700"
                  : "border-red-500/40 bg-red-500/20 text-red-400"
              }`}
              title={micOn ? "Mute Microphone" : "Unmute Microphone"}
            >
              {micOn ? <FaMicrophone size={16} /> : <FaMicrophoneSlash size={16} />}
            </button>

            {/* Camera Toggle */}
            <button
              onClick={toggleCamera}
              className={`flex h-12 w-12 items-center justify-center rounded-xl border transition cursor-pointer ${
                cameraOn
                  ? "border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700"
                  : "border-red-500/40 bg-red-500/20 text-red-400"
              }`}
              title={cameraOn ? "Turn Camera Off" : "Turn Camera On"}
            >
              {cameraOn ? <FaVideo size={16} /> : <FaVideoSlash size={16} />}
            </button>

            {/* Next Stranger Button (Large) */}
            <button
              onClick={handleNextStranger}
              className="flex items-center gap-2 rounded-xl bg-cyan-400 px-7 py-3 text-sm font-bold text-black transition hover:bg-cyan-300 cursor-pointer shadow-md shadow-cyan-400/10"
            >
              <FaForward size={14} />
              <span>Next Stranger</span>
            </button>

            {/* End Call Button */}
            <button
              onClick={endCall}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500 text-white transition hover:bg-red-600 cursor-pointer"
              title="End Call"
            >
              <FaPhoneSlash size={16} />
            </button>
          </div>
        </div>

        {/* RIGHT SECTION: IN-CALL TEXT CHAT (SIDEBAR) */}
        <div className="flex flex-col h-[480px] lg:h-[595px] w-full lg:w-[360px] rounded-2xl border border-zinc-800 bg-[#11131c] shadow-xl overflow-hidden">
          
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5 bg-black/30">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <h3 className="text-sm font-bold text-white">Live Chat</h3>
            </div>
            <span className="text-[11px] text-zinc-400">
              {matchState === "connected" ? "Connected" : "Waiting"}
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-xs text-zinc-500">
                {matchState === "connected"
                  ? "Say hello to the stranger! 👋"
                  : "Connecting you to a stranger..."}
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
                    <span className="my-1 rounded-full bg-white/5 px-3 py-1 text-[11px] text-zinc-400 text-center">
                      {msg.text}
                    </span>
                  ) : (
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2 text-xs leading-relaxed ${
                        msg.sender === "you"
                          ? "bg-cyan-500 text-black font-medium rounded-br-none"
                          : "bg-zinc-800 text-white rounded-bl-none border border-zinc-700/50"
                      }`}
                    >
                      <p>{msg.text}</p>
                      <span
                        className={`block text-[9px] mt-1 text-right ${
                          msg.sender === "you" ? "text-black/60" : "text-zinc-400"
                        }`}
                      >
                        {msg.time}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSendMessage} className="border-t border-zinc-800 p-3 bg-black/20 flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                matchState === "connected" ? "Type a message..." : "Waiting for match..."
              }
              disabled={matchState !== "connected"}
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900/90 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || matchState !== "connected"}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-black transition hover:bg-cyan-300 disabled:opacity-40 cursor-pointer"
            >
              <FaPaperPlane size={12} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}