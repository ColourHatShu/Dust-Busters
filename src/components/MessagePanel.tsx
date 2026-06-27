"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send } from "lucide-react";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  profiles: { name: string } | null;
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function MessagePanel({
  bookingId,
  currentUserId,
  initialMessages,
}: {
  bookingId: string;
  currentUserId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Timestamps depend on Date.now() and the viewer's locale/timezone, which differ
  // between the server render and the browser — render them only after mount to
  // avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => setMounted(true), []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("msgs-" + bookingId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "booking_messages",
          filter: "booking_id=eq." + bookingId,
        },
        async (payload) => {
          // Fetch the new message with the sender's profile name
          const { data } = await supabase
            .from("booking_messages")
            .select("id, sender_id, body, created_at, profiles(name)")
            .eq("id", payload.new.id)
            .single();
          if (data) {
            setMessages((prev) => {
              // Avoid duplicate if we already added it optimistically
              if (prev.some((m) => m.id === data.id)) return prev;
              return [
                ...prev,
                {
                  id: data.id,
                  sender_id: data.sender_id,
                  body: data.body,
                  created_at: data.created_at,
                  profiles: Array.isArray(data.profiles)
                    ? data.profiles[0] ?? null
                    : (data.profiles as { name: string } | null),
                },
              ];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("send_booking_message", {
        p_booking_id: bookingId,
        p_body: trimmed,
      });
      if (rpcError) throw new Error(rpcError.message);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card flex flex-col gap-4">
      <h3 className="font-semibold text-slate-900">Messages</h3>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1"
      >
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-400">
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_id === currentUserId;
          const senderName =
            (Array.isArray(msg.profiles)
              ? msg.profiles[0]?.name
              : msg.profiles?.name) ?? "Unknown";
          return (
            <div
              key={msg.id}
              className={`flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}
            >
              <span className="text-xs text-slate-400">
                {isOwn ? "You" : senderName}
                {mounted && <> &middot; {formatRelativeTime(msg.created_at)}</>}
              </span>
              <div
                className={`max-w-xs rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                  isOwn
                    ? "rounded-tr-sm bg-teal-600 text-white"
                    : "rounded-tl-sm bg-slate-100 text-slate-800"
                }`}
              >
                {msg.body}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 items-end">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 500))}
          placeholder="Type a message..."
          rows={2}
          className="input-modern flex-1 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as unknown as React.FormEvent);
            }
          }}
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          className="btn-base btn-primary flex items-center gap-1.5 self-end disabled:opacity-50"
        >
          <Send className="h-4 w-4" strokeWidth={1.5} />
          <span>{sending ? "..." : "Send"}</span>
        </button>
      </form>
      <p className="text-xs text-slate-400 text-right">
        {body.length}/500 &middot; Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
