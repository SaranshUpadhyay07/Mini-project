import React, { useEffect, useRef, useState, useCallback } from "react";
import { NavbarDemo } from "../components/Navbar";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";

export default function Itinerary() {
  const { currentUser } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState("chat"); // 'chat' | 'planner'
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const listEndRef = useRef(null);

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
      const res = await fetch("http://localhost:8000/planner", {
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
      await fetch("http://localhost:8000/planner", {
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
      const res = await fetch(`http://localhost:8000${endpoint}`, {
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
              ? "text-orange-100 hover:text-white"
              : "text-orange-600 hover:text-orange-800")
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

  const renderPlannerBubble = (payload) => {
    if (!payload || typeof payload !== "object") {
      return <p className="text-sm text-gray-800">No response received.</p>;
    }

    if (payload.reset === true) {
      return (
        <p className="text-sm text-gray-800">
          Reset done. Send your trip details to begin.
        </p>
      );
    }

    if (payload.ok === false) {
      return (
        <p className="text-sm text-gray-800">
          {payload.error ||
            "Problem fetching itinerary right now. Please try again."}
        </p>
      );
    }

    const meta = payload.meta || {};
    const destination = meta.destination || "Odisha";
    const dateRange = meta.date_range || "NA";
    const days = meta.trip_length_days ?? "NA";

    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Your itinerary ({days} days) · {destination}
          </p>
          <p className="text-xs text-gray-600">{dateRange}</p>
        </div>

        {Array.isArray(meta.clarifying_questions) &&
          meta.clarifying_questions.length > 0 && (
            <div className="rounded-xl border border-orange-100 bg-orange-50/70 p-3">
              <p className="text-xs font-semibold text-orange-800">
                Quick questions
              </p>
              <ul className="mt-1 list-disc pl-5 text-xs text-orange-900/90 space-y-1">
                {meta.clarifying_questions.map((q, idx) => (
                  <li key={idx}>{q}</li>
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
            {Array.isArray(payload.itinerary) &&
            payload.itinerary.length > 0 ? (
              payload.itinerary.map((d) => (
                <div
                  key={d.day}
                  className="rounded-lg border border-gray-200 bg-white p-3"
                >
                  <p className="text-sm font-semibold text-orange-700">
                    Day {d.day}
                  </p>
                  {["morning", "afternoon", "evening"].map((slot) => (
                    <div key={slot} className="mt-2">
                      <p className="text-xs font-semibold text-gray-700 capitalize">
                        {slot}
                      </p>
                      <ul className="mt-1 space-y-1">
                        {Array.isArray(d[slot]) && d[slot].length > 0 ? (
                          d[slot].map((item, idx) => (
                            <li key={idx} className="text-xs text-gray-700">
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
              <p className="mt-1 text-xs text-gray-700">
                {payload.budget?.currency || "NA"}{" "}
                {payload.budget?.trip_estimate ?? "NA"}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-xs font-semibold text-gray-800">Transport</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-gray-700 space-y-1">
                {Array.isArray(payload.logistics?.local_transport) &&
                payload.logistics.local_transport.length > 0 ? (
                  payload.logistics.local_transport.map((t, idx) => (
                    <li key={idx}>{t}</li>
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 to-white">
      <NavbarDemo />
      <Header />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 pt-8 lg:pt-12 sm:pt-8 space-y-10">
        {/* Header */}
        <header className="space-y-3">
          <p className="text-xs sm:text-sm uppercase tracking-wide text-orange-500 font-semibold">
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
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Chat header */}
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white px-5 py-4 sm:px-6">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Itinerary Assistant
                </p>
                <p className="text-xs text-gray-600">
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
                      ? "border-orange-300 bg-orange-500 text-white hover:bg-orange-600"
                      : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50")
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
                  className="inline-flex items-center justify-center rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-orange-700 shadow-sm transition hover:bg-orange-50 disabled:opacity-60"
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
                      className="w-full rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition"
                    >
                      Yes, use my chat context
                    </button>
                    <button
                      onClick={() => switchToPlanner(false)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
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
            <div className="h-[52vh] sm:h-[56vh] overflow-y-auto px-4 py-5 sm:px-6 bg-gradient-to-b from-white to-orange-50/30">
              {messages.length === 0 ? (
                <div className="mx-auto max-w-xl">
                  <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                    <p className="text-sm font-semibold text-orange-800">
                      Start here
                    </p>
                    <p className="mt-1 text-sm text-orange-900/80">
                      Tell me your dates, starting city, pace, and must-visit
                      places in Odisha.
                    </p>
                    <p className="mt-2 text-xs text-orange-900/70">
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
                              ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white border-orange-500"
                              : "bg-white text-gray-900 border-gray-200")
                          }
                        >
                          {m.type === "planner" ? (
                            <div className="text-gray-900">
                              {renderPlannerBubble(m.data)}
                            </div>
                          ) : (
                            <p
                              className={
                                "text-sm whitespace-pre-wrap " +
                                (isUser ? "text-white" : "text-gray-800")
                              }
                            >
                              {renderWithLinks(m.content, isUser)}
                            </p>
                          )}
                          <div
                            className={
                              "mt-2 text-[11px] " +
                              (isUser ? "text-orange-50/90" : "text-gray-500")
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
                          <span className="h-1.5 w-1.5 rounded-full bg-orange-300 animate-pulse" />
                          <span className="h-1.5 w-1.5 rounded-full bg-orange-300 animate-pulse" />
                          <span className="h-1.5 w-1.5 rounded-full bg-orange-300 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div ref={listEndRef} />
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-gray-100 bg-white px-4 py-4 sm:px-6">
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
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm sm:text-base text-gray-800 shadow-inner focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
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
                        className="rounded-full bg-orange-50 px-3 py-1 text-orange-700 border border-orange-100 hover:bg-orange-100"
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
                    className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed"
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

          {/* Sample Output */}
          <aside className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Sample itinerary preview
            </h2>

            <div className="mt-4 space-y-4 text-sm text-gray-700">
              <div>
                <p className="font-semibold text-orange-600">Day 1</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>06:00 AM – Suprabhatam darshan</li>
                  <li>08:00 AM – Breakfast near Padmavati Temple</li>
                  <li>10:00 AM – Govindaraja Swamy Temple visit</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-orange-600">Day 2</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Sunrise at Kapila Theertham</li>
                  <li>Vegetarian lunch & rest</li>
                  <li>Evening stroll at Papavinasanam</li>
                </ul>
              </div>

              <div className="rounded-lg border border-dashed border-orange-200 bg-orange-50 p-3 text-xs sm:text-sm text-orange-800">
                💡 Tip: Mention exact dates, mobility needs, and your starting
                city for better recommendations.
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
