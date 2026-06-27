"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "./message-actions";
import { Send } from "lucide-react";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  profiles: { name: string } | null;
};

type Props = {
  bookingId: string;
  currentUserId: string;
  initialMessages: Message[];
};

export default function MessagePanel({
  bookingId,
  currentUserId,
  initialMessages,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Time formatting is locale/timezone-dependent (server vs browser) — render it
  // only after mount so the first client render matches the server (no hydration
  // mismatch).
  const [mounted, setMounted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`booking_messages:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "booking_messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        async (payload) => {
          const newRow = payload.new as {
            id: string;
            sender_id: string;
            body: string;
            created_at: string;
          };
          // Fetch the sender profile name
          const { data: profile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", newRow.sender_id)
            .single();

          const msg: Message = {
            ...newRow,
            profiles: profile ?? null,
          };

          setMessages((prev) => {
            // Avoid duplicates (optimistic adds)
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(bookingId, body.trim());
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
      <div className="border-b border-white/10 bg-white/[0.02] px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">Messages</h2>
      </div>

      {/* Message thread */}
      <div className="flex max-h-72 min-h-32 flex-col gap-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="my-4 text-center text-sm text-slate-500">
            No messages yet. Say hello to your cleaner!
          </p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_id === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}
            >
              <span className="text-xs text-slate-500">
                {isOwn ? "You" : msg.profiles?.name ?? "Cleaner"}
                {mounted && <> &middot; {formatTime(msg.created_at)}</>}
              </span>
              <div
                className={`max-w-xs rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                  isOwn
                    ? "rounded-tr-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                    : "rounded-tl-sm border border-white/10 bg-white/[0.06] text-slate-200"
                }`}
              >
                {msg.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-white/10 px-4 py-3"
      >
        <input
          className="input-dark flex-1"
          placeholder="Type a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={sending}
          maxLength={1000}
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="btn-base btn-glow px-3 py-2 disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" strokeWidth={2} />
        </button>
      </form>
      {error && <p className="px-4 pb-3 text-xs text-red-400">{error}</p>}
    </div>
  );
}
