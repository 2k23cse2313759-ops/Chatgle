"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";
import {
  FaPaperPlane,
  FaRedo,
  FaShieldAlt,
  FaCommentDots,
  FaFilter,
  FaFlag,
  FaSmile,
} from "react-icons/fa";

interface Message {
  id: string;
  sender: "you" | "stranger" | "system";
  text: string;
  time: string;
}

const SOCKET_SERVER_URL = "http://localhost:5000";

const STRANGER_LIST = [
  { name: "Maya", country: "🇨🇦 Canada", hobby: "Photography" },
  { name: "Lucas", country: "🇧🇷 Brazil", hobby: "Gaming" },
  { name: "Elena", country: "🇮🇹 Italy", hobby: "Cooking" },
  { name: "Noah", country: "🇦🇺 Australia", hobby: "Surfing" },
  { name: "Priya", country: "🇮🇳 India", hobby: "Coding" },
];

export default function TextChat() {
  const [matchState, setMatchState] = useState<"searching" | "connected" | "ended">("searching");
  const [stranger, setStranger] = useState(STRANGER_LIST[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("Anything");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isRealPeer, setIsRealPeer] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize Socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ["websocket", "polling"],
      timeout: 5000,
    });
    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      console.log("Connected to Text Chat Backend:", newSocket.id);
      newSocket.emit("join_queue", { mode: "text", interests: [selectedTopic] });
    });

    newSocket.on("match_found", (data) => {
      console.log("Real Text Match Found!", data);
      setRoomId(data.roomId);
      setIsRealPeer(true);
      setStranger({
        name: data.partnerInfo.name,
        country: data.partnerInfo.country,
        hobby: data.partnerInfo.interests[0] || "Chatting",
      });
      setMatchState("connected");
      setMessages([
        {
          id: Date.now().toString(),
          sender: "system",
          text: `Matched with real user from ${data.partnerInfo.country}! Say Hello 👋`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
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
      setMatchState("ended");
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "system",
          text: "Stranger disconnected.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    });

    newSocket.on("connect_error", () => {
      console.log("Backend offline, running in demo mode.");
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Search and auto-match logic (with demo fallback)
  useEffect(() => {
    if (matchState === "searching") {
      setMessages([]);
      setIsRealPeer(false);
      setRoomId(null);

      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("join_queue", { mode: "text", interests: [selectedTopic] });
      }

      // Fallback demo match after 2.5s if no socket match
      const timer = setTimeout(() => {
        if (!isRealPeer && matchState === "searching") {
          const randomStranger = STRANGER_LIST[Math.floor(Math.random() * STRANGER_LIST.length)];
          setStranger(randomStranger);
          setMatchState("connected");
          setMessages([
            {
              id: "1",
              sender: "system",
              text: `Matched with a stranger from ${randomStranger.country}! Say Hello 👋`,
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
                  text: `Hey! I love ${randomStranger.hobby}. What are you up to today?`,
                  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
              ]);
            }, 1500);
          }, 1000);
        }
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [matchState]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || matchState !== "connected") return;

    const newMsg: Message = {
      id: Date.now().toString(),
      sender: "you",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);

    // Send via socket if real peer
    if (isRealPeer && roomId && socketRef.current) {
      socketRef.current.emit("send_message", { roomId, text: textToSend });
    } else {
      // Demo simulated reply
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          const replies = [
            "That's so interesting! Tell me more ✨",
            "Haha really? I wasn't expecting that! 😄",
            "Where are you from by the way?",
            "Nice! I totally agree with you 🔥",
          ];
          const randomReply = replies[Math.floor(Math.random() * replies.length)];
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              sender: "stranger",
              text: randomReply,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }, 1800);
      }, 800);
    }

    if (!customText) setInputMessage("");
  };

  const handleNext = () => {
    setMatchState("searching");
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("next_stranger", { mode: "text", interests: [selectedTopic] });
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
            <FaCommentDots className="text-xl" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Chatgle Random Text Chat</h2>
            <p className="text-xs text-gray-400">Anonymous & Encrypted Text Room</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleNext}
            className="flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-bold text-black transition hover:bg-cyan-300 cursor-pointer shadow-lg shadow-cyan-400/20"
          >
            <FaRedo />
            <span>Next Stranger (Esc)</span>
          </button>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="relative flex h-[580px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-2xl backdrop-blur-2xl">
        {/* Top Status Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-black/40">
          <div className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${
                matchState === "connected" ? "bg-green-400 animate-pulse" : "bg-yellow-400 animate-ping"
              }`}
            />
            <div>
              <p className="text-sm font-bold text-white">
                {matchState === "connected" ? stranger.name : "Searching for stranger..."}
              </p>
              {matchState === "connected" && (
                <p className="text-xs text-gray-400">{stranger.country}</p>
              )}
            </div>
          </div>

          <div className="text-xs text-gray-400">
            Topic: <span className="text-cyan-300 font-semibold">{selectedTopic}</span>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {matchState === "searching" ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-cyan-400 border-t-transparent text-cyan-400"
              >
                ⚡
              </motion.div>
              <h3 className="text-lg font-bold text-white">Finding a text partner...</h3>
              <p className="mt-1 text-xs text-gray-400">Matching with real online users</p>
            </div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${
                  msg.sender === "you"
                    ? "items-end"
                    : msg.sender === "system"
                    ? "items-center"
                    : "items-start"
                }`}
              >
                {msg.sender === "system" ? (
                  <span className="my-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1 text-xs text-cyan-300">
                    {msg.text}
                  </span>
                ) : (
                  <div
                    className={`max-w-[75%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-lg ${
                      msg.sender === "you"
                        ? "bg-gradient-to-r from-cyan-400 to-cyan-500 text-black font-medium rounded-br-none"
                        : "bg-white/10 text-white rounded-bl-none border border-white/10 backdrop-blur-md"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span
                      className={`block text-[10px] mt-1 text-right ${
                        msg.sender === "you" ? "text-black/60" : "text-gray-400"
                      }`}
                    >
                      {msg.time}
                    </span>
                  </div>
                )}
              </motion.div>
            ))
          )}

          {isTyping && (
            <div className="flex items-center gap-2 text-gray-400 text-xs pl-2">
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" />
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce delay-150" />
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce delay-300" />
              <span>{stranger.name} is typing...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        {matchState === "connected" && (
          <div className="flex items-center gap-2 overflow-x-auto px-6 py-2 border-t border-white/5 bg-black/20 text-xs">
            <span className="text-gray-500 flex-shrink-0">Quick Hi:</span>
            {["Hey! 👋", "Where are you from? 🌎", "What are your hobbies? 🎨", "How's your day? ✨"].map(
              (chip) => (
                <button
                  key={chip}
                  onClick={() => handleSend(undefined, chip)}
                  className="flex-shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-300 hover:bg-cyan-400/20 hover:text-cyan-300 transition cursor-pointer"
                >
                  {chip}
                </button>
              )
            )}
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSend} className="border-t border-white/10 p-4 bg-black/40 flex gap-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={matchState === "connected" ? "Type your message..." : "Waiting for match..."}
            disabled={matchState !== "connected"}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none disabled:opacity-50"
          />

          <button
            type="button"
            onClick={handleNext}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-xs font-bold text-gray-300 hover:bg-white/10 transition cursor-pointer"
          >
            Skip
          </button>

          <button
            type="submit"
            disabled={!inputMessage.trim() || matchState !== "connected"}
            className="flex items-center gap-2 rounded-2xl bg-cyan-400 px-6 py-3.5 text-sm font-bold text-black transition hover:bg-cyan-300 disabled:opacity-40 cursor-pointer shadow-lg shadow-cyan-400/20"
          >
            <span>Send</span>
            <FaPaperPlane size={13} />
          </button>
        </form>
      </div>
    </div>
  );
}
