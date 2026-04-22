"use client";

import { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Trash2,
  CheckCircle,
  Bot,
  User,
  Volume2,
  VolumeX,
  Shield,
  Mic,
  MicOff,
} from "lucide-react";
import { Button } from "./ui/button";
import { GlassCard } from "./ui/card";
import { Badge } from "./ui/badge";
import { useTranslation, type Language } from "./LanguageSelector";

// Map our internal language codes to BCP-47 locales used by the
// Web Speech API.  "fr" is historically our code for Spanish content
// (see LanguageSelector.tsx for the rationale).
const SPEECH_LOCALES: Record<Language, string> = {
  en: "en-US",
  fr: "es-CO",
};

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  filedReportId?: string;
}

// Inline TTS for chat messages
function ChatTTS({ text }: { text: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("TTS failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("TTS error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handlePlay}
      disabled={isLoading}
      className="ml-1 p-1 rounded hover:bg-slate-600/50 transition-colors"
      title={isPlaying ? "Stop" : "Listen"}
    >
      {isLoading ? (
        <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
      ) : isPlaying ? (
        <VolumeX className="w-3 h-3 text-indigo-400" />
      ) : (
        <Volume2 className="w-3 h-3 text-slate-400 hover:text-indigo-400" />
      )}
    </button>
  );
}

export function ChatWidget() {
  const { language } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize speech recognition. Recreate whenever the active UI
  // language changes so the recognizer uses the correct BCP-47 locale
  // (e.g. "es-CO" for Spanish/Colombia instead of defaulting to English).
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    ) {
      return;
    }

    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = SPEECH_LOCALES[language] ?? "es-CO";

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {
        // Ignore errors when cleaning up a recognizer that never started.
      }
      recognitionRef.current = null;
    };
  }, [language]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Get or create session ID
  useEffect(() => {
    let id = localStorage.getItem("veritas-session-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("veritas-session-id", id);
    }
    setSessionId(id);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId,
          language,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: Date.now(),
        filedReportId: data.filedReportId,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage =
        language === "en"
          ? "Sorry, I encountered an error. Please try again."
          : "Lo siento, tuve un problema procesando tu mensaje. Por favor intenta de nuevo.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    setMessages([]);
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "clear",
          sessionId,
          clearHistory: true,
        }),
      });
    } catch (error) {
      console.error("Error clearing chat:", error);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Chat bubble button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
          isOpen
            ? "bg-slate-700 hover:bg-slate-600"
            : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:shadow-xl hover:scale-105"
        }`}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] animate-in slide-in-from-bottom-4 fade-in duration-200">
          <GlassCard className="flex flex-col h-[500px] max-h-[calc(100vh-150px)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Veritas Assistant</h3>
                  <p className="text-xs text-slate-400">Ask or report issues</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="text-slate-400 hover:text-white h-8 w-8"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Bot className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 mb-2">
                    Hello! I'm Veritas, your civic assistant.
                  </p>
                  <p className="text-xs text-slate-500 mb-2">
                    Ask me questions or tell me about issues you'd like to report.
                  </p>
                  <div className="flex items-center justify-center gap-1 text-xs text-purple-400">
                    <Shield className="w-3 h-3" />
                    <span>All responses verified on Solana blockchain</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {[
                      "Report a pothole",
                      "Garbage collection schedule",
                      "Noise bylaw hours",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="text-xs px-3 py-1.5 rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-2 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-700/80 text-slate-100"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.filedReportId && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle className="w-3 h-3" />
                        Report filed: {msg.filedReportId.slice(0, 8)}...
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <p
                        className={`text-xs ${
                          msg.role === "user" ? "text-indigo-200" : "text-slate-500"
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                      </p>
                      {msg.role === "assistant" && (
                        <ChatTTS text={msg.content} />
                      )}
                    </div>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-slate-700/80 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                      <span
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <span
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? "Listening..." : "Type a message..."}
                  className={`flex-1 bg-slate-800/80 border rounded-xl px-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none transition-colors ${
                    isListening ? "border-red-500 animate-pulse" : "border-slate-600 focus:border-indigo-500"
                  }`}
                  disabled={isLoading}
                />
                {recognitionRef.current && (
                  <Button
                    type="button"
                    onClick={toggleVoiceInput}
                    disabled={isLoading}
                    variant="outline"
                    size="icon"
                    className={`rounded-xl ${isListening ? "bg-red-500/20 border-red-500 text-red-400" : "border-slate-600"}`}
                    title={isListening ? "Stop listening" : "Voice input"}
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  variant="gradient"
                  size="icon"
                  className="rounded-xl"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </>
  );
}
