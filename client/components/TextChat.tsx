"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { FaPaperPlane, FaForward } from "react-icons/fa";

interface Message {
  id: string;
  sender: "you" | "stranger" | "system";
  text: string;
  time: string;
}

const SOCKET_SERVER_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export default function TextChat() {
  const [matchState, setMatchState] = useState<"searching" | "connected" | "ended">("searching");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isRealPeer, setIsRealPeer] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize Socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ["websocket", "polling"],
      timeout: 7000,
    });
    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      newSocket.emit("join_queue", { mode: "text" });
    });

    newSocket.on("match_found", (data) => {
      setRoomId(data.roomId);
      setIsRealPeer(true);
      setMatchState("connected");
      setMessages([
        {
          id: Date.now().toString(),
          sender: "system",
          text: "You're now chatting with a random stranger. Say hi!",
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
          text: "Stranger has disconnected.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || matchState !== "connected") return;

    const text = inputMessage.trim();
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newMsg: Message = {
      id: Date.now().toString(),
      sender: "you",
      text,
      time,
    };

    setMessages((prev) => [...prev, newMsg]);

    if (isRealPeer && roomId && socketRef.current) {
      socketRef.current.emit("send_message", { roomId, text });
    }

    setInputMessage("");
  };

  const handleNext = () => {
    setMatchState("searching");
    setMessages([]);
    setIsRealPeer(false);
    setRoomId(null);
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("next_stranger", { mode: "text" });
    }
  };

  return (
    <div className="relative z-10 mx-auto max-w-4xl px-4 py-6">
      {/* Main Chat Container */}
      <div className="relative flex h-[620px] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#0c0d14] shadow-2xl">
        {/* Top Status Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                matchState === "connected" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
              }`}
            />
            <p className="text-sm font-semibold text-white">
              {matchState === "connected" ? "Stranger" : "Looking for stranger..."}
            </p>
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2 text-xs font-bold text-black transition hover:bg-cyan-300 cursor-pointer shadow-sm"
          >
            <FaForward size={12} />
            <span>Next Stranger</span>
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {matchState === "searching" ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <h3 className="text-base font-semibold text-white">Looking for someone to chat with...</h3>
              <p className="mt-1 text-xs text-zinc-400">Searching ({searchSeconds}s)</p>
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
                  <span className="my-1 rounded-full bg-white/5 px-4 py-1 text-xs text-zinc-400">
                    {msg.text}
                  </span>
                ) : (
                  <div
                    className={`max-w-[75%] rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
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

        {/* Input Bar */}
        <form onSubmit={handleSend} className="border-t border-zinc-800 p-4 bg-zinc-950/80 flex gap-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={matchState === "connected" ? "Type your message..." : "Waiting for match..."}
            disabled={matchState !== "connected"}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-xs text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none disabled:opacity-40"
          />

          <button
            type="button"
            onClick={handleNext}
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
          >
            Skip
          </button>

          <button
            type="submit"
            disabled={!inputMessage.trim() || matchState !== "connected"}
            className="flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-xs font-bold text-black transition hover:bg-cyan-300 disabled:opacity-40 cursor-pointer"
          >
            <span>Send</span>
            <FaPaperPlane size={11} />
          </button>
        </form>
      </div>
    </div>
  );
}
