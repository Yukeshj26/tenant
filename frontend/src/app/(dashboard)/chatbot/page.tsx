"use client";
// Chatbot page — multilingual AI assistant with mic/voice input

import { useState, useRef, useEffect, useCallback } from "react";
import { chatbotAPI } from "@/lib/api";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Send, Bot, User, Loader2, Trash2, Mic, MicOff } from "lucide-react";

interface Message { role: "user" | "bot"; text: string; timestamp: string; }

// Map app language codes → BCP-47 locales for SpeechRecognition
const LANG_LOCALE: Record<string, string> = {
  en: "en-IN",
  ta: "ta-IN",
  hi: "hi-IN",
};

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Hello! I'm TenantSense AI Assistant. I can help you understand tenant risk predictions, suggest retention strategies, and answer your property management questions. How can I help you today?", timestamp: new Date().toISOString() },
  ]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("en");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Check browser SpeechRecognition support
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setMicSupported(!!SR);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    setMicError(null);
    const recognition: SpeechRecognition = new SR();
    recognition.lang = LANG_LOCALE[language] || "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        setMicError("Microphone permission denied. Please allow microphone access.");
      } else if (event.error !== "aborted") {
        setMicError(`Speech error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [language]);

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    if (isListening) stopListening();
    const userMsg: Message = { role: "user", text: input, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setLoading(true);

    try {
      const res = await chatbotAPI.send(currentInput, language, sessionId);
      setSessionId(res.data.session_id);
      setMessages(prev => [...prev, { role: "bot", text: res.data.response, timestamp: res.data.timestamp }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "bot",
        text: language === "ta"
          ? "மன்னிக்கவும், தற்போது இணைக்க இயலவில்லை. சிறிது நேரத்தில் மீண்டும் முயற்சிக்கவும்."
          : language === "hi"
          ? "क्षमा करें, कनेक्शन में समस्या है। कृपया पुनः प्रयास करें।"
          : "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
      }]);
    } finally { setLoading(false); }
  };

  const quickPrompts = [
    { en: "What does a 75% risk score mean?", ta: "75% ஆபத்து மதிப்பெண் என்றால் என்ன?", hi: "75% जोखिम स्कोर का क्या मतलब है?" },
    { en: "How to retain a high-risk tenant?",  ta: "அதிக ஆபத்துள்ள குத்தகைதாரை எவ்வாறு தக்கவைக்கலாம்?", hi: "उच्च जोखिम वाले किरायेदार को कैसे बनाए रखें?" },
    { en: "Explain SHAP values in simple terms", ta: "SHAP மதிப்புகளை எளிமையாக விளக்குங்கள்", hi: "SHAP मानों को सरल भाषा में समझाएं" },
  ];

  return (
    <div className="fade-in-up" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 4rem)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <div className="section-label">Multilingual Support</div>
          <h1 className="page-title">AI Assistant</h1>
          <p className="page-subtitle">Ask about tenant risk, retention strategies &amp; more</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <LanguageSwitcher value={language} onChange={setLanguage} />
          <button id="clear-chat-btn" className="btn-secondary" onClick={() => {
            setMessages([{ role: "bot", text: "Chat cleared. How can I help you?", timestamp: new Date().toISOString() }]);
            setSessionId(undefined);
          }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "1.5rem",
        marginBottom: "0.875rem",
        background: "#ffffff",
        border: "1px solid rgba(122,158,126,0.14)",
        borderRadius: 20,
        boxShadow: "0 4px 32px rgba(44,44,44,0.08)",
        display: "flex", flexDirection: "column", gap: "1rem",
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", gap: 10, justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end" }}>
            {msg.role === "bot" && (
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: "linear-gradient(135deg, #4e7a54, #7a9e7e)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                boxShadow: "0 2px 8px rgba(78,122,84,0.25)",
              }}>
                <Bot size={16} color="white" />
              </div>
            )}
            <div style={{
              maxWidth: "72%",
              padding: "0.875rem 1.125rem",
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: msg.role === "user"
                ? "linear-gradient(135deg, #c4714a, #d9916e)"
                : "#faf7f2",
              border: msg.role === "bot" ? "1px solid rgba(122,158,126,0.18)" : "none",
              fontSize: "0.875rem",
              lineHeight: 1.7,
              color: msg.role === "user" ? "#ffffff" : "#2c2c2c",
              whiteSpace: "pre-wrap",
              boxShadow: "0 2px 8px rgba(44,44,44,0.06)",
            }}>
              {msg.text}
            </div>
            {msg.role === "user" && (
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: "linear-gradient(135deg, #a8c5ac, #7a9e7e)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <User size={16} color="white" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "linear-gradient(135deg, #4e7a54, #7a9e7e)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Bot size={16} color="white" />
            </div>
            <div style={{
              background: "#faf7f2",
              border: "1px solid rgba(122,158,126,0.18)",
              borderRadius: "18px 18px 18px 4px",
              padding: "0.875rem 1.125rem",
              display: "flex", alignItems: "center", gap: 8,
              color: "#888880", fontSize: "0.82rem",
            }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Mic error banner */}
      {micError && (
        <div style={{
          marginBottom: "0.5rem", padding: "0.5rem 1rem",
          background: "rgba(196,113,74,0.08)", border: "1px solid rgba(196,113,74,0.25)",
          borderRadius: 10, fontSize: "0.75rem", color: "#c4714a", fontWeight: 600,
        }}>
          🎤 {micError}
        </div>
      )}

      {/* Listening indicator */}
      {isListening && (
        <div style={{
          marginBottom: "0.5rem", padding: "0.5rem 1rem",
          background: "rgba(196,113,74,0.06)", border: "1px solid rgba(196,113,74,0.2)",
          borderRadius: 10, fontSize: "0.78rem", color: "#c4714a", fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%", background: "#c4714a",
            animation: "micPulse 1s ease-in-out infinite",
            display: "inline-block",
          }} />
          Listening in {language === "ta" ? "Tamil" : language === "hi" ? "Hindi" : "English"}... Speak now
        </div>
      )}

      {/* Quick prompts */}
      <div style={{ display: "flex", gap: 8, marginBottom: "0.75rem", overflowX: "auto", paddingBottom: 4 }}>
        {quickPrompts.map((p, i) => {
          const prompt = p[language as keyof typeof p] || p.en;
          return (
            <button key={i} id={`quick-prompt-${i}`}
              onClick={() => { setInput(prompt); }}
              style={{
                padding: "0.4rem 0.875rem",
                borderRadius: 40,
                border: "1px solid rgba(122,158,126,0.3)",
                background: "rgba(122,158,126,0.08)",
                color: "#4e7a54",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(122,158,126,0.18)";
                e.currentTarget.style.borderColor = "#7a9e7e";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(122,158,126,0.08)";
                e.currentTarget.style.borderColor = "rgba(122,158,126,0.3)";
              }}>
              {prompt}
            </button>
          );
        })}
      </div>

      {/* Input row */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          id="chat-input"
          className="input-field"
          placeholder={
            isListening
              ? "🎤 Listening..."
              : language === "ta" ? "உங்கள் கேள்வியை தமிழில் கேளுங்கள்..."
              : language === "hi" ? "अपना प्रश्न हिंदी में पूछें..."
              : "Ask about tenant risk, retention strategies..."
          }
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          style={{
            flex: 1,
            borderColor: isListening ? "#c4714a" : undefined,
            boxShadow: isListening ? "0 0 0 4px rgba(196,113,74,0.12)" : undefined,
          }}
        />

        {/* Mic button — only shown if browser supports SpeechRecognition */}
        {micSupported && (
          <button
            id="mic-btn"
            onClick={toggleMic}
            title={isListening ? "Stop recording" : `Speak in ${language === "ta" ? "Tamil" : language === "hi" ? "Hindi" : "English"}`}
            style={{
              width: 44, height: 44,
              borderRadius: 14,
              border: isListening
                ? "2px solid #c4714a"
                : "1.5px solid rgba(44,44,44,0.15)",
              background: isListening
                ? "linear-gradient(135deg, #c4714a, #d9916e)"
                : "#ffffff",
              color: isListening ? "#ffffff" : "#888880",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.2s ease",
              animation: isListening ? "micPulse 1.2s ease-in-out infinite" : "none",
              boxShadow: isListening
                ? "0 4px 14px rgba(196,113,74,0.35)"
                : "0 1px 4px rgba(44,44,44,0.08)",
            }}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}

        <button
          id="send-chat-btn"
          className="btn-primary"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{ padding: "0.625rem 1.125rem", height: 44 }}
        >
          {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={16} />}
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(196,113,74,0.45); }
          50%       { box-shadow: 0 0 0 8px rgba(196,113,74,0); }
        }
      `}</style>
    </div>
  );
}
