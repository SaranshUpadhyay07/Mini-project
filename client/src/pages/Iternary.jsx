import React, { useEffect, useRef, useState, useCallback } from "react";
import { IconMicrophone, IconMicrophoneOff } from '@tabler/icons-react';

const AGENT_BASE = import.meta.env.VITE_AGENT_URL ?? "";
import { NavbarDemo } from "../components/Navbar";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { speechToTextService } from "../services/speechToTextService";
import translationService from "../services/translationService";

// Message with translation dropdown component for text messages
function MessageWithTranslation({ messageId, content, renderWithLinks, translateMessage, supportedLanguages, translatingMessageId }) {
  const [selectedLang, setSelectedLang] = useState("en-IN");
  const [showDropdown, setShowDropdown] = useState(false);
  const [displayContent, setDisplayContent] = useState(content);

  const handleTranslate = async (langCode) => {
    if (langCode === "en-IN") {
      setDisplayContent(content);
      setSelectedLang(langCode);
      setShowDropdown(false);
      return;
    }

    const translated = await translateMessage(messageId, langCode, content);
    setDisplayContent(translated);
    setSelectedLang(langCode);
    setShowDropdown(false);
  };

  return (
    <div>
      {/* Translation dropdown */}
      <div className="flex justify-end mb-2">
        <TranslateButton 
          selectedLang={selectedLang}
          showDropdown={showDropdown}
          setShowDropdown={setShowDropdown}
          handleTranslate={handleTranslate}
          supportedLanguages={supportedLanguages}
          translatingMessageId={translatingMessageId}
          messageId={messageId}
        />
      </div>
      
      {/* Message content */}
      <p className="text-sm whitespace-pre-wrap text-gray-800 leading-relaxed" style={{ lineHeight: '1.8' }}>
        {renderWithLinks(displayContent, false)}
      </p>
    </div>
  );
}

// Planner bubble with translation component
function PlannerBubbleWithTranslation({ messageId, payload, translatePlannerData, supportedLanguages, translatingMessageId }) {
  const [selectedLang, setSelectedLang] = useState("en-IN");
  const [showDropdown, setShowDropdown] = useState(false);
  const [displayData, setDisplayData] = useState(payload);
  const [translationProgress, setTranslationProgress] = useState(null); // { completed, total }

  const handleTranslate = async (langCode) => {
    if (langCode === "en-IN") {
      setDisplayData(payload);
      setSelectedLang(langCode);
      setShowDropdown(false);
      setTranslationProgress(null);
      return;
    }

    // Progress callback to update UI as translations complete
    const onProgressUpdate = (partialData, completed, total) => {
      setDisplayData(partialData);
      setTranslationProgress({ completed, total });
      console.log(`[Translation Progress] ${completed}/${total} fields translated`);
    };

    setTranslationProgress({ completed: 0, total: 1 }); // Initialize progress

    // Use smart planner translation with progressive updates
    const translatedPayload = await translatePlannerData(
      messageId, 
      langCode, 
      payload,
      onProgressUpdate // Pass callback for live updates
    );
    
    setDisplayData(translatedPayload);
    setSelectedLang(langCode);
    setShowDropdown(false);
    setTranslationProgress(null); // Clear progress when done
  };

  const data = displayData;

  if (!data || typeof data !== "object") {
    return (
      <div>
        <div className="flex justify-end mb-2">
          <TranslateButton 
            selectedLang={selectedLang}
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
            handleTranslate={handleTranslate}
            supportedLanguages={supportedLanguages}
            translatingMessageId={translatingMessageId}
            messageId={messageId}
          />
        </div>
        <p className="text-sm text-gray-800">No response received.</p>
      </div>
    );
  }

  if (data.reset === true) {
    return (
      <div>
        <div className="flex justify-end mb-2">
          <TranslateButton 
            selectedLang={selectedLang}
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
            handleTranslate={handleTranslate}
            supportedLanguages={supportedLanguages}
            translatingMessageId={translatingMessageId}
            messageId={messageId}
          />
        </div>
        <p className="text-sm text-gray-800">
          Reset done. Send your trip details to begin.
        </p>
      </div>
    );
  }

  if (data.ok === false) {
    return (
      <div>
        <div className="flex justify-end mb-2">
          <TranslateButton 
            selectedLang={selectedLang}
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
            handleTranslate={handleTranslate}
            supportedLanguages={supportedLanguages}
            translatingMessageId={translatingMessageId}
            messageId={messageId}
          />
        </div>
        <p className="text-sm text-gray-800">
          {data.error ||
            "Problem fetching itinerary right now. Please try again."}
        </p>
      </div>
    );
  }

  const meta = data.meta || {};
  const destination = meta.destination || "Odisha";
  const dateRange = meta.date_range || "NA";
  const days = meta.trip_length_days ?? "NA";

  return (
    <div className="space-y-3">
      {/* Translation dropdown at the top */}
      <div className="flex justify-end">
        <TranslateButton 
          selectedLang={selectedLang}
          showDropdown={showDropdown}
          setShowDropdown={setShowDropdown}
          handleTranslate={handleTranslate}
          supportedLanguages={supportedLanguages}
          translatingMessageId={translatingMessageId}
          messageId={messageId}
        />
      </div>

      {/* Translation Progress Indicator */}
      {translationProgress && (
        <div className="bg-sand border border-primary-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-primary-dark">
              ✨ Live translation in progress...
            </span>
            <span className="text-xs text-primary-dark">
              {translationProgress.completed}/{translationProgress.total} fields
            </span>
          </div>
          <div className="w-full bg-primary-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-primary-light h-full transition-all duration-300 ease-out"
              style={{ 
                width: `${(translationProgress.completed / translationProgress.total) * 100}%` 
              }}
            />
          </div>
        </div>
      )}
      
      <div>
        <p className="text-sm font-semibold text-gray-900">
          Your itinerary ({days} days) · {destination}
        </p>
        <p className="text-xs text-gray-600">{dateRange}</p>
      </div>

      {Array.isArray(meta.clarifying_questions) &&
        meta.clarifying_questions.length > 0 && (
          <div className="rounded-xl border border-primary-100 bg-sand/70 p-3">
            <p className="text-xs font-semibold text-primary-dark">
              Quick questions
            </p>
            <ul className="mt-2 list-disc pl-5 text-xs text-primary-dark/90 space-y-2">
              {meta.clarifying_questions.map((q, idx) => (
                <li key={idx} className="leading-relaxed" style={{ lineHeight: '1.6' }}>{q}</li>
              ))}
            </ul>
          </div>
        )}

      <details className="group rounded-xl border border-gray-200 bg-white/60 p-3">
        <summary className="cursor-pointer select-none text-sm font-semibold text-gray-900">
          Day-by-day plan
          <span className="ml-2 text-xs font-normal text-gray-500 group-open:hidden">
            (click to expand)
          </span>
        </summary>
        <div className="mt-3 space-y-3">
          {Array.isArray(data.itinerary) &&
          data.itinerary.length > 0 ? (
            data.itinerary.map((d) => (
              <div
                key={d.day}
                className="rounded-lg border border-gray-200 bg-white p-3"
              >
                <p className="text-sm font-semibold text-primary-dark">
                  Day {d.day}
                </p>
                {["morning", "afternoon", "evening"].map((slot) => (
                  <div key={slot} className="mt-2">
                    <p className="text-xs font-semibold text-gray-700 capitalize">
                      {slot}
                    </p>
                    <ul className="mt-1 space-y-2">
                      {Array.isArray(d[slot]) && d[slot].length > 0 ? (
                        d[slot].map((item, idx) => (
                          <li key={idx} className="text-xs text-gray-700 leading-relaxed" style={{ lineHeight: '1.6' }}>
                            <span className="font-semibold text-gray-900">
                              {item.time || "NA"}
                            </span>
                            <span className="text-gray-500"> · </span>
                            <span>{item.activity || "NA"}</span>
                            {item.area_and_transit ? (
                              <span className="text-gray-500">
                                {" "}
                                — {item.area_and_transit}
                              </span>
                            ) : null}
                          </li>
                        ))
                      ) : (
                        <li className="text-xs text-gray-500">NA</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-600">No itinerary returned.</p>
          )}
        </div>
      </details>

      <details className="group rounded-xl border border-gray-200 bg-white/60 p-3">
        <summary className="cursor-pointer select-none text-sm font-semibold text-gray-900">
          Budget, logistics & tips
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs font-semibold text-gray-800">Budget</p>
            <p className="mt-1 text-xs text-gray-700 leading-relaxed" style={{ lineHeight: '1.6' }}>
              {data.budget?.currency || "NA"}{" "}
              {data.budget?.trip_estimate ?? "NA"}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs font-semibold text-gray-800">Transport</p>
            <ul className="mt-2 list-disc pl-5 text-xs text-gray-700 space-y-2">
              {Array.isArray(data.logistics?.local_transport) &&
              data.logistics.local_transport.length > 0 ? (
                data.logistics.local_transport.map((t, idx) => (
                  <li key={idx} className="leading-relaxed" style={{ lineHeight: '1.6' }}>{t}</li>
                ))
              ) : (
                <li>NA</li>
              )}
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
}

// Reusable translate button component
function TranslateButton({ selectedLang, showDropdown, setShowDropdown, handleTranslate, supportedLanguages, translatingMessageId, messageId }) {
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, setShowDropdown]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={translatingMessageId === messageId}
        className="text-xs text-gray-500 hover:text-primary transition flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-sand shadow-sm"
        title="Translate this message"
      >
        🌐 {supportedLanguages.find(l => l.code === selectedLang)?.name || 'Translate'}
        {translatingMessageId === messageId ? ' ⏳' : ' ▾'}
      </button>
      
      {showDropdown && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border-2 border-gray-300 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto">
          {supportedLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleTranslate(lang.code)}
              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-sand transition-colors flex items-center gap-2 first:rounded-t-xl last:rounded-b-xl ${
                selectedLang === lang.code ? 'bg-sand text-primary-dark font-semibold' : 'text-gray-800 hover:text-primary'
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="flex-1">{lang.name}</span>
              {selectedLang === lang.code && <span className="text-primary font-bold">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Itinerary() {
  const { currentUser } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState("chat"); // 'chat' | 'planner'
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [messageTranslations, setMessageTranslations] = useState({}); // Store translations per message
  const [translatingMessageId, setTranslatingMessageId] = useState(null); // Track which message is being translated
  const listEndRef = useRef(null);

  // Supported languages for translation
  const supportedLanguages = [
    { code: "en-IN", name: "English", flag: "🇬🇧" },
    { code: "hi-IN", name: "हिंदी", flag: "🇮🇳" },
    { code: "bn-IN", name: "বাংলা", flag: "🇮🇳" },
    { code: "gu-IN", name: "ગુજરાતી", flag: "🇮🇳" },
    { code: "kn-IN", name: "ಕನ್ನಡ", flag: "🇮🇳" },
    { code: "ml-IN", name: "മലയാളം", flag: "🇮🇳" },
    { code: "mr-IN", name: "मराठी", flag: "🇮🇳" },
    { code: "or-IN", name: "ଓଡ଼ିଆ", flag: "🇮🇳" },
    { code: "pa-IN", name: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
    { code: "ta-IN", name: "தமிழ்", flag: "🇮🇳" },
    { code: "te-IN", name: "తెలుగు", flag: "🇮🇳" },
  ];

  // Load cached translations from sessionStorage on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('message_translations');
      if (cached) {
        setMessageTranslations(JSON.parse(cached));
      }
    } catch (error) {
      console.error('Failed to load cached translations:', error);
    }
  }, []);

  const newChatId = () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const [chatId, setChatId] = useState(() => {
    const KEY = "itinerary_chat_id";
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const created = newChatId();
    window.localStorage.setItem(KEY, created);
    return created;
  });

  const userId = currentUser?.uid || "guest";

  const getChatSessions = () => {
    try {
      const cached = sessionStorage.getItem('itinerary_chat_sessions');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  };
  
  const [historyTab, setHistoryTab] = useState("chat");
  const [chatSessions, setChatSessions] = useState(getChatSessions);
  const [plannerSessions, setPlannerSessions] = useState([]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (mode === "planner") return; // Keep chat history entirely separate from planner output!
    
    setChatSessions((prev) => {
      let list = [...prev];
      const idx = list.findIndex(s => s.id === chatId);
      const titleMsg = messages.find(m => m.role === 'user' && m.type === 'text');
      const title = titleMsg ? titleMsg.content.substring(0, 30) + (titleMsg.content.length > 30 ? "..." : "") : "New Trip";
      
      const sessionData = { id: chatId, title, mode, messages, updatedAt: Date.now() };
      if (idx >= 0) list[idx] = sessionData;
      else list.unshift(sessionData);
      
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      list = list.slice(0, 5); // Keep last 5 sessions
      try { sessionStorage.setItem('itinerary_chat_sessions', JSON.stringify(list)); } catch (e) {}
      return list;
    });
  }, [messages, chatId, mode]);

  useEffect(() => {
    if (historyTab === 'planner' && userId !== "guest") {
      fetch(`${AGENT_BASE}/planner/history?user_id=${userId}`)
        .then(res => res.json())
        .then(data => {
          if (data.ok && data.history) {
            setPlannerSessions(data.history.slice(0, 5));
          }
        })
        .catch(err => console.error("Failed to fetch planner history:", err));
    }
  }, [historyTab, userId]);

  const loadChatSession = (id) => {
    const s = chatSessions.find(x => x.id === id);
    if (!s) return;
    setChatId(s.id);
    setMode(s.mode);
    setMessages(s.messages);
    setError("");
  };

  const loadPlannerSession = async (cId) => {
    try {
      setLoading(true);
      const res = await fetch(`${AGENT_BASE}/planner/${cId}?user_id=${userId}`);
      const data = await res.json();
      if (data.ok && data.itinerary) {
        setChatId(data.chat_id);
        setMode("planner");

        // Format historical messages properly so they don't overwrite current chat behavior
        const loadedMessages = [];
        
        // Add chat history correctly if it exists to maintain continuity
        if (data.chat_history && Array.isArray(data.chat_history)) {
           loadedMessages.push(...data.chat_history.map((msg, i) => ({
             id: `hist_${Date.now()}_${i}`,
             role: msg.role || 'user',
             type: 'text',
             content: msg.message || msg.content || '',
             ts: Date.now() - (data.chat_history.length - i) * 1000
           })));
        }

        // Add the planner history item to the end
        loadedMessages.push({
          id: `a_${Date.now()}`,
          role: "assistant",
          type: "planner",
          data: data.itinerary,
          ts: Date.now()
        });

        setMessages(loadedMessages);
      }
    } catch (err) {
      console.error("Failed to load planner session", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  // Build a plain-text summary of the current chat to seed the planner with context.
  const buildChatSummary = useCallback(() => {
    const relevant = messages.filter(
      (m) => m.type === "text" && m.content && m.role !== "error",
    );
    if (relevant.length === 0) return null;
    const lines = relevant.map((m) => {
      const label = m.role === "user" ? "User" : "Assistant";
      return `${label}: ${m.content}`;
    });
    return (
      "CONTEXT FROM A PRIOR CHAT:\n" +
      lines.join("\n\n") +
      "\n\nUse this conversation to understand the traveller's preferences, dates, destinations, budget, " +
      "group composition, dietary needs, mobility constraints, and any other relevant details. " +
      "Now create a detailed Odisha itinerary based on what was discussed. " +
      "If specific details are clear, incorporate them directly. " +
      "If some details are still ambiguous, add up to 5 clarifying questions to meta.clarifying_questions and proceed with reasonable assumptions."
    );
  }, [messages]);

  // Intercept the mode toggle: if switching chat → planner and chat has content, ask the user.
  const handleModeToggle = () => {
    if (
      mode === "chat" &&
      messages.some((m) => m.type === "text" && m.role !== "error")
    ) {
      setShowSwitchModal(true);
    } else {
      setMode((m) => (m === "planner" ? "chat" : "planner"));
    }
  };

  // Called by modal buttons.
  const switchToPlanner = async (withContext) => {
    setShowSwitchModal(false);
    setMode("planner");

    if (!withContext) return;

    const summary = buildChatSummary();
    if (!summary) return;

    // Show a lightweight system message so the user knows what happened.
    setMessages((prev) => [
      ...prev,
      {
        id: `sys_${Date.now()}`,
        role: "assistant",
        type: "text",
        content: "📋 Chat context carried over — generating your itinerary…",
        ts: Date.now(),
      },
    ]);

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${AGENT_BASE}/planner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          chat_id: chatId,
          message: summary,
        }),
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      const data = await res.json();
      setMessages((prev) => {
        const ts = Date.now();
        return [
          ...prev,
          { id: `a_${ts}`, role: "assistant", type: "planner", data, ts },
        ];
      });
    } catch (err) {
      const msg =
        err?.message || "Something went wrong generating your itinerary.";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: `e_${Date.now()}`,
          role: "assistant",
          type: "error",
          content: msg,
          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = async () => {
    setError("");
    setLoading(true);
    const KEY = "itinerary_chat_id";
    const created = newChatId();
    try {
      // Planner has a server-side reset; chat does not. This call is safe even if you haven't used planner yet.
      await fetch(`${AGENT_BASE}/planner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          chat_id: created,
          message: "RESET",
        }),
      });
      window.localStorage.setItem(KEY, created);
      setChatId(created);
      setMessages([
        {
          id: `sys_${Date.now()}`,
          role: "assistant",
          type: "text",
          content:
            "Reset done. You can chat normally, or switch to Planner mode for a structured itinerary.",
          ts: Date.now(),
        },
      ]);
    } catch (err) {
      setError(err?.message || "Could not reset right now.");
    } finally {
      setLoading(false);
    }
  };

  const sendPrompt = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    setError("");
    setPrompt("");
    const now = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: `u_${now}`, role: "user", type: "text", content: trimmed, ts: now },
    ]);
    setLoading(true);

    try {
      const endpoint = mode === "planner" ? "/planner" : "/chat";
      const res = await fetch(`${AGENT_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          chat_id: chatId,
          message: trimmed,
        }),
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      const data = await res.json();
      
      setMessages((prev) => {
        const ts = Date.now();
        if (mode === "planner") {
          return [
            ...prev,
            { id: `a_${ts}`, role: "assistant", type: "planner", data, ts },
          ];
        }

        // /chat returns { result: string }
        return [
          ...prev,
          {
            id: `a_${ts}`,
            role: "assistant",
            type: "text",
            content: data?.result || "No response received.",
            ts,
          },
        ];
      });
    } catch (err) {
      const msg = err?.message || "Something went wrong.";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: `e_${Date.now()}`,
          role: "assistant",
          type: "error",
          content: msg,
          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ts) => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(ts));
    } catch {
      return "";
    }
  };

  // Parses markdown-style links [Display](https://url) in agent replies and
  // renders them as real <a> tags. Everything else is kept as plain text.
  const renderWithLinks = (text, isUser) => {
    if (!text) return null;
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const [, label, url] = match;
      parts.push(
        <a
          key={key++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={
            "underline decoration-dotted hover:decoration-solid font-medium " +
            (isUser
              ? "text-primary-100 hover:text-white"
              : "text-primary hover:text-primary-dark")
          }
        >
          {label}
        </a>,
      );
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  // Handle voice recording for speech-to-text
  const handleVoiceRecording = async () => {
    try {
      setRecordingError("");

      if (isRecording) {
        // Stop recording and transcribe
        setIsRecording(false);
        const result = await speechToTextService.stopRecordingAndTranscribe();
        
        if (result.transcript) {
          // Set the transcript in the prompt field
          setPrompt(result.transcript);
        }
      } else {
        // Start recording
        await speechToTextService.startRecording();
        setIsRecording(true);
        
        // Auto-stop after 10 seconds
        setTimeout(() => {
          if (speechToTextService.getIsRecording()) {
            handleVoiceRecording();
          }
        }, 10000);
      }
    } catch (err) {
      console.error('Voice recording error:', err);
      setIsRecording(false);
      setRecordingError(err.message || "Failed to record audio. Please try again.");
      speechToTextService.cancelRecording();
    }
  };

  // Translate a specific message
  // Translate regular chat message (text only) - preserves formatting
  const translateMessage = async (messageId, targetLanguage, originalContent) => {
    const cacheKey = `${messageId}_${targetLanguage}`;
    
    // Check if already cached in state
    if (messageTranslations[cacheKey]) {
      return messageTranslations[cacheKey];
    }

    // Check sessionStorage
    try {
      const cached = sessionStorage.getItem('message_translations');
      if (cached) {
        const allTranslations = JSON.parse(cached);
        if (allTranslations[cacheKey]) {
          setMessageTranslations(prev => ({ ...prev, [cacheKey]: allTranslations[cacheKey] }));
          return allTranslations[cacheKey];
        }
      }
    } catch (error) {
      console.error('Failed to check cached translation:', error);
    }

    // Translate using Sarvam AI - preserve line breaks and structure
    setTranslatingMessageId(messageId);
    try {
      // Split by double line breaks (paragraphs) first, then by single line breaks
      const paragraphs = originalContent.split('\n\n');
      const translatedParagraphs = [];

      for (const paragraph of paragraphs) {
        if (!paragraph.trim()) {
          translatedParagraphs.push('');
          continue;
        }

        // Split each paragraph by single line breaks to preserve list structure
        const lines = paragraph.split('\n');
        const translatedLines = [];

        for (const line of lines) {
          if (!line.trim()) {
            translatedLines.push('');
            continue;
          }

          const translated = await translationService.translateText(
            line.trim(),
            targetLanguage,
            "en-IN"
          );
          translatedLines.push(translated);
        }

        translatedParagraphs.push(translatedLines.join('\n'));
      }

      const finalTranslated = translatedParagraphs.join('\n\n');

      // Update state and sessionStorage
      const newTranslations = { ...messageTranslations, [cacheKey]: finalTranslated };
      setMessageTranslations(newTranslations);
      
      try {
        sessionStorage.setItem('message_translations', JSON.stringify(newTranslations));
      } catch (error) {
        console.error('Failed to cache translation:', error);
      }

      return finalTranslated;
    } catch (error) {
      console.error('Translation error:', error);
      return originalContent; // Return original on error
    } finally {
      setTranslatingMessageId(null);
    }
  };

  // Translate planner data (JSON structure) - only visible text fields with progressive updates
  const translatePlannerData = async (messageId, targetLanguage, originalPayload, onProgressUpdate) => {
    const cacheKey = `planner_${messageId}_${targetLanguage}`;
    
    // Check if already cached in state
    if (messageTranslations[cacheKey]) {
      return messageTranslations[cacheKey];
    }

    // Check sessionStorage
    try {
      const cached = sessionStorage.getItem('message_translations');
      if (cached) {
        const allTranslations = JSON.parse(cached);
        if (allTranslations[cacheKey]) {
          setMessageTranslations(prev => ({ ...prev, [cacheKey]: allTranslations[cacheKey] }));
          return allTranslations[cacheKey];
        }
      }
    } catch (error) {
      console.error('Failed to check cached planner translation:', error);
    }

    setTranslatingMessageId(messageId);
    try {
      // Deep clone the payload
      const translatedPayload = JSON.parse(JSON.stringify(originalPayload));

      // Extract all text fields that need translation (visible in UI)
      const translationTasks = []; // Array of {path, text}

      // Meta clarifying questions
      if (Array.isArray(translatedPayload.meta?.clarifying_questions)) {
        translatedPayload.meta.clarifying_questions.forEach((q, idx) => {
          if (q && q.length < 2000) {
            translationTasks.push({
              path: ['meta', 'clarifying_questions', idx],
              text: q
            });
          }
        });
      }

      // Stay areas
      if (Array.isArray(translatedPayload.stay_areas)) {
        translatedPayload.stay_areas.forEach((area, idx) => {
          if (area.area && area.area.length < 2000) {
            translationTasks.push({
              path: ['stay_areas', idx, 'area'],
              text: area.area
            });
          }
          if (area.why && area.why.length < 2000) {
            translationTasks.push({
              path: ['stay_areas', idx, 'why'],
              text: area.why
            });
          }
        });
      }

      // Itinerary activities
      if (Array.isArray(translatedPayload.itinerary)) {
        translatedPayload.itinerary.forEach((day, dayIdx) => {
          ['morning', 'afternoon', 'evening'].forEach(slot => {
            if (Array.isArray(day[slot])) {
              day[slot].forEach((item, itemIdx) => {
                if (item.activity && item.activity.length < 2000) {
                  translationTasks.push({
                    path: ['itinerary', dayIdx, slot, itemIdx, 'activity'],
                    text: item.activity
                  });
                }
                if (item.area_and_transit && item.area_and_transit.length < 2000) {
                  translationTasks.push({
                    path: ['itinerary', dayIdx, slot, itemIdx, 'area_and_transit'],
                    text: item.area_and_transit
                  });
                }
              });
            }
          });
        });
      }

      // Budget notes
      if (Array.isArray(translatedPayload.budget?.notes)) {
        translatedPayload.budget.notes.forEach((note, idx) => {
          if (note && note.length < 2000) {
            translationTasks.push({
              path: ['budget', 'notes', idx],
              text: note
            });
          }
        });
      }

      // Logistics transport
      if (Array.isArray(translatedPayload.logistics?.local_transport)) {
        translatedPayload.logistics.local_transport.forEach((transport, idx) => {
          if (transport && transport.length < 2000) {
            translationTasks.push({
              path: ['logistics', 'local_transport', idx],
              text: transport
            });
          }
        });
      }

      // Logistics notes
      if (Array.isArray(translatedPayload.logistics?.notes)) {
        translatedPayload.logistics.notes.forEach((note, idx) => {
          if (note && note.length < 2000) {
            translationTasks.push({
              path: ['logistics', 'notes', idx],
              text: note
            });
          }
        });
      }

      // Tips - scams
      if (Array.isArray(translatedPayload.tips?.scams)) {
        translatedPayload.tips.scams.forEach((tip, idx) => {
          if (tip && tip.length < 2000) {
            translationTasks.push({
              path: ['tips', 'scams', idx],
              text: tip
            });
          }
        });
      }

      // Tips - weather
      if (Array.isArray(translatedPayload.tips?.weather)) {
        translatedPayload.tips.weather.forEach((tip, idx) => {
          if (tip && tip.length < 2000) {
            translationTasks.push({
              path: ['tips', 'weather', idx],
              text: tip
            });
          }
        });
      }

      // Packing list
      if (Array.isArray(translatedPayload.packing)) {
        translatedPayload.packing.forEach((item, idx) => {
          if (item && item.length < 2000) {
            translationTasks.push({
              path: ['packing', idx],
              text: item
            });
          }
        });
      }

      console.log(`[Translation] Translating ${translationTasks.length} text fields for planner data (progressive)`);

      // Translate fields in batches with progressive updates
      const BATCH_SIZE = 3; // Translate 3 fields at a time for smoother visual progress
      let completed = 0;

      for (let i = 0; i < translationTasks.length; i += BATCH_SIZE) {
        const batch = translationTasks.slice(i, i + BATCH_SIZE);
        
        // Translate batch in parallel
        const batchResults = await Promise.all(
          batch.map(task => 
            translationService.translateText(task.text, targetLanguage, "en-IN")
          )
        );

        // Apply translations to payload
        batchResults.forEach((translatedText, batchIdx) => {
          const { path } = batch[batchIdx];
          let current = translatedPayload;
          // Navigate to the correct nested position
          for (let j = 0; j < path.length - 1; j++) {
            current = current[path[j]];
          }
          current[path[path.length - 1]] = translatedText;
        });

        completed += batch.length;
        
        // Trigger progress update to show live translation
        if (onProgressUpdate) {
          onProgressUpdate(
            JSON.parse(JSON.stringify(translatedPayload)), // Clone to avoid reference issues
            completed,
            translationTasks.length
          );
        }

        // Small delay between batches to make progress visible (only if not last batch)
        if (i + BATCH_SIZE < translationTasks.length) {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
        }
      }

      // Update state and sessionStorage with final result
      const newTranslations = { ...messageTranslations, [cacheKey]: translatedPayload };
      setMessageTranslations(newTranslations);
      
      try {
        sessionStorage.setItem('message_translations', JSON.stringify(newTranslations));
      } catch (error) {
        console.error('Failed to cache planner translation:', error);
      }

      return translatedPayload;
    } catch (error) {
      console.error('Planner translation error:', error);
      return originalPayload; // Return original on error
    } finally {
      setTranslatingMessageId(null);
    }
  };

  const renderPlannerBubble = (payload, messageId) => {
    return (
      <PlannerBubbleWithTranslation
        messageId={messageId}
        payload={payload}
        translatePlannerData={translatePlannerData}
        supportedLanguages={supportedLanguages}
        translatingMessageId={translatingMessageId}
      />
    );
  };

  return (
    <div className="min-h-screen bg-sand/40">
      <NavbarDemo />
      <Header />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 pt-8 lg:pt-12 sm:pt-8 space-y-10">
        {/* Header */}
        <header className="space-y-3">
          <p className="text-xs sm:text-sm uppercase tracking-wide text-primary font-semibold">
            Itinerary AI
          </p>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 leading-tight">
            Plan a personalized pilgrimage
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl">
            Share your travel dates, temple preferences, pace, and family needs.
            We’ll create a calm, well-paced day-by-day itinerary with darshan
            slots, travel time, and meal breaks.
          </p>
        </header>

        {/* Content */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Chat Box */}
          <div className="lg:col-span-2 rounded-2xl border border-primary-200 bg-sand-light shadow-sm overflow-hidden">
            {/* Chat header */}
            <div className="flex items-center justify-between gap-3 border-b border-white bg-sand px-5 py-4 sm:px-6 bg-[#4F46E5]">
              <div>
                <p className="text-sm font-semibold text-white ">
                  Itinerary Assistant
                </p>
                <p className="text-xs text-white">
                  Mode: {mode === "planner" ? "Planner" : "Chat"} · Odisha only
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleModeToggle}
                  disabled={loading}
                  className={
                    "inline-flex items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold shadow-sm transition disabled:opacity-60 " +
                    (mode === "planner"
                      ? "border-primary-300 bg-white text-primary-dark hover:bg-primary"
                      : "border-primary-200 bg-white text-primary-dark hover:bg-primary-100")
                  }
                  aria-label="Toggle planner mode"
                  title={
                    mode === "planner"
                      ? "Switch to chat endpoint (/chat)"
                      : "Switch to planner endpoint (/planner)"
                  }
                >
                  {mode === "planner" ? "Planner" : "Chat"}
                </button>
                <button
                  onClick={resetChat}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-lg border border-white  px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-100 disabled:opacity-60"
                  aria-label="Reset chat"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Chat-to-Planner context modal */}
            {showSwitchModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
                  <h3 className="text-base font-semibold text-gray-900">
                    Switch to Planner?
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    You have an active chat. Would you like to carry your
                    conversation context into the planner so it can use your
                    preferences and trip details?
                  </p>
                  <div className="mt-5 flex flex-col gap-2">
                    <button
                      onClick={() => switchToPlanner(true)}
                      className="w-full rounded-xl bg-[#4F46E5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary transition"
                    >
                      Yes, use my chat context
                    </button>
                    <button
                      onClick={() => switchToPlanner(false)}
                      className="w-full rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary-dark hover:bg-primary-100 transition"
                    >
                      No, start fresh
                    </button>
                    <button
                      onClick={() => setShowSwitchModal(false)}
                      className="w-full rounded-xl px-4 py-2 text-sm text-gray-400 hover:text-gray-600 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="h-[52vh] sm:h-[56vh] overflow-y-auto px-4 py-5 sm:px-6 bg-sand-light">
              {messages.length === 0 ? (
                <div className="mx-auto max-w-xl">
                  <div className="rounded-2xl border border-primary-100 bg-sand/60 p-4">
                    <p className="text-sm font-semibold text-primary-dark">
                      Start here
                    </p>
                    <p className="mt-1 text-sm text-primary-dark/80">
                      Tell me your dates, starting city, pace, and must-visit
                      places in Odisha.
                    </p>
                    <p className="mt-2 text-xs text-primary-dark/70">
                      Example: “3 days in Bhubaneswar–Puri with elderly parents,
                      early mornings, minimal walking.”
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => {
                    const isUser = m.role === "user";
                    return (
                      <div
                        key={m.id}
                        className={
                          "flex " + (isUser ? "justify-end" : "justify-start")
                        }
                      >
                        <div
                          className={
                            "max-w-[92%] sm:max-w-[78%] rounded-2xl px-4 py-3 shadow-sm border " +
                            (isUser
                              ? "bg-primary text-[#4F46E5] border-[#4F46E5]"
                              : "bg-white text-gray-900 border-gray-200")
                          }
                        >
                          {m.type === "planner" ? (
                            <div className="text-gray-900">
                              {renderPlannerBubble(m.data, m.id)}
                            </div>
                          ) : !isUser ? (
                            <MessageWithTranslation 
                              messageId={m.id}
                              content={m.content}
                              renderWithLinks={renderWithLinks}
                              translateMessage={translateMessage}
                              supportedLanguages={supportedLanguages}
                              translatingMessageId={translatingMessageId}
                            />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap text-[#4F46E5] font-semibold leading-relaxed" style={{ lineHeight: '1.8' }}>
                              {renderWithLinks(m.content, isUser)}
                            </p>
                          )}
                          <div
                            className={
                              "mt-2 text-[11px] " +
                              (isUser ? "text-primary-50/90" : "text-gray-500")
                            }
                          >
                            {formatTime(m.ts)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {loading ? (
                    <div className="flex justify-start">
                      <div className="max-w-[92%] sm:max-w-[78%] rounded-2xl px-4 py-3 shadow-sm border border-gray-200 bg-white">
                        <p className="text-sm text-gray-600">Thinking…</p>
                        <div className="mt-2 flex gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary-300 animate-pulse" />
                          <span className="h-1.5 w-1.5 rounded-full bg-primary-300 animate-pulse" />
                          <span className="h-1.5 w-1.5 rounded-full bg-primary-300 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div ref={listEndRef} />
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-primary-100 bg-sand-light px-4 py-4 sm:px-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendPrompt();
                }}
                className="flex items-end gap-3"
              >
                <div className="flex-1">
                  <label className="sr-only" htmlFor="prompt">
                    Message
                  </label>
                  <div className="relative">
                    <textarea
                      id="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendPrompt();
                        }
                      }}
                      rows={1}
                      placeholder="Type your trip details…"
                      className="w-full resize-none rounded-xl border border-gray-200 bg-sand px-4 py-3 pr-12 text-sm sm:text-base text-gray-800 shadow-inner focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                      disabled={isRecording}
                    />
                    {/* Mic button inside textarea */}
                    <button
                      type="button"
                      onClick={handleVoiceRecording}
                      disabled={loading}
                      className={
                        "absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 transition-all " +
                        (isRecording
                          ? "bg-red-500 text-white animate-pulse shadow-lg"
                          : "bg-sand text-primary hover:bg-primary-200")
                      }
                      title={isRecording ? "Click to stop recording" : "Click to start voice input"}
                    >
                      {isRecording ? (
                        <IconMicrophone className="h-4 w-4" />
                      ) : (
                        <IconMicrophoneOff className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {isRecording && (
                    <p className="mt-1 text-xs text-red-600 font-medium animate-pulse">
                      🔴 Recording... (click mic to stop)
                    </p>
                  )}
                  {recordingError && (
                    <p className="mt-1 text-xs text-red-600">
                      {recordingError}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {[
                      "3 days",
                      "Elderly-friendly",
                      "Low walking",
                      "Budget stay",
                      "Veg food",
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setPrompt((p) => (p ? `${p} ${tag}` : tag))
                        }
                        className="rounded-full bg-sand px-3 py-1 text-primary-dark border border-primary-100 hover:bg-sand"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={loading || !prompt.trim()}
                    className="inline-flex items-center justify-center rounded-xl bg-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? "Sending…" : "Send"}
                  </button>
                  {error ? (
                    <p className="text-xs text-red-600 max-w-[10rem]">
                      {error}
                    </p>
                  ) : null}
                </div>
              </form>
            </div>
          </div>

          {/* History Sidebar */}
          <aside className="rounded-2xl border border-primary-200 bg-sand-light p-5 sm:p-6 shadow-sm flex flex-col h-full max-h-[85vh]">
            <div className="flex border-b border-primary-100 mb-4">
              <button 
                className={`flex-1 pb-3 px-2 text-sm font-semibold transition-colors ${historyTab === 'chat' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setHistoryTab('chat')}
              >
                Chat History
              </button>
              <button 
                className={`flex-1 pb-3 px-2 text-sm font-semibold transition-colors ${historyTab === 'planner' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setHistoryTab('planner')}
              >
                Planner History
              </button>
            </div>
            
            <div className="flex-1 space-y-3 overflow-y-auto pr-2">
              {historyTab === 'chat' && (
                chatSessions.length > 0 ? (
                  chatSessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => loadChatSession(session.id)}
                      className={`w-full text-left p-4 rounded-xl transition-all border ${
                        chatId === session.id
                          ? "bg-sand border-[#4F46E5] border-2 shadow-sm"
                          : "bg-white border-gray-100 hover:bg-sand hover:border-gray-300"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <p className={`font-semibold text-sm truncate flex-1 ${chatId === session.id ? "text-primary-dark" : "text-gray-800"}`}>
                          {session.title}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(session.updatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-sm text-gray-500 bg-sand rounded-xl border border-dashed border-gray-200">
                    No recent chat history in this session.
                  </div>
                )
              )}
              {historyTab === 'planner' && (
                plannerSessions.length > 0 ? (
                  plannerSessions.map(session => (
                    <button
                      key={session.chat_id}
                      onClick={() => loadPlannerSession(session.chat_id)}
                      className={`w-full text-left p-4 rounded-xl transition-all border ${
                        chatId === session.chat_id && mode === "planner"
                          ? "bg-sand border-[#4F46E5] border-2 shadow-sm"
                          : "bg-white border-gray-100 hover:bg-sand hover:border-gray-300"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <p className={`font-semibold text-sm truncate flex-1 ${chatId === session.chat_id && mode === "planner" ? "text-primary-dark" : "text-gray-800"}`}>
                          {session.destination} ({session.trip_length_days > 0 ? `${session.trip_length_days} Days` : 'Planning'})
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(session.updated_at || session.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-sm text-gray-500 bg-sand rounded-xl border border-dashed border-[#4F46E5]">
                    {userId === "guest" ? "Login to view planner history." : "No planner history found."}
                  </div>
                )
              )}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}