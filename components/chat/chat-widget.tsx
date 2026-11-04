"use client";

import { type CSSProperties, type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { BotAvatar } from "@/components/chat/bot-avatar";
import { ArrowRightIcon, CloseIcon } from "@/components/icons";
import { type AnswerLink, type PredefinedAnswer, predefinedAnswers } from "@/lib/chat-answers";
import { site } from "@/lib/site";
import "./chat-widget.css";

type Message = { role: "user" | "assistant"; content: string; links?: readonly AnswerLink[] };

const MAX_CHARS = 1000;
// Keeps requests small. The route accepts up to 20 messages.
const HISTORY_LENGTH = 12;

const errorText = (status?: number) =>
  status === 429
    ? "Too many messages for now. Please try again in a few minutes."
    : `${site.assistant} is unavailable right now. You can email ${site.email} instead.`;

/*
 * Floating chat about the CV. Buttons answer from lib/chat-answers.ts without a
 * request. Typed questions stream from /api/chat as plain text and render as
 * text only, so nothing a model writes can become markup on the page.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (messages.length > 0 || error) log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages, error]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    launcher.current?.focus();
  };

  const showAnswer = ({ question, answer, links }: PredefinedAnswer) => {
    if (busy) return;
    setError(null);
    setMessages((current) => [
      ...current,
      { role: "user", content: question },
      { role: "assistant", content: answer, links },
    ]);
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;

    const history: Message[] = [...messages, { role: "user", content }];
    setMessages(history);
    setDraft("");
    setError(null);
    setBusy(true);

    const controller = new AbortController();
    request.current = controller;
    let reply = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // The route rejects longer messages, and a long predefined answer must not break the chat.
          messages: history.slice(-HISTORY_LENGTH).map(({ role, content }) => ({ role, content: content.slice(0, MAX_CHARS) })),
        }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        setError(errorText(response.status));
        return;
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += value;
        setMessages([...history, { role: "assistant", content: reply }]);
      }
      if (!reply.trim()) setError(errorText());
    } catch {
      if (!controller.signal.aborted) setError(errorText());
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send(draft);
  };

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") close();
  };

  // Enter sends and Shift+Enter starts a new line. Enter that confirms IME text (Khmer, for one) does neither.
  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void send(draft);
  };

  const waiting = busy && messages.at(-1)?.role === "user";
  const asked = new Set(messages.map(({ content }) => content));
  const remaining = predefinedAnswers.filter(({ question }) => !asked.has(question));

  const questionButtons = (
    <ul className="grid gap-2 pt-2 sm:grid-cols-2">
      {remaining.map((item) => (
        <li key={item.question}>
          <button
            type="button"
            onClick={() => showAnswer(item)}
            className="min-h-14 w-full rounded-2xl border border-foreground/10 px-4 py-2.5 text-left text-[15px] leading-snug transition-colors duration-150 hover:border-foreground/30"
          >
            {item.question}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <div
        id="chat-panel"
        role="dialog"
        aria-label={site.assistant}
        data-open={open}
        inert={!open}
        onKeyDown={handlePanelKeyDown}
        className="chat-panel flex h-[min(820px,max(calc(100dvh-14rem),min(320px,calc(100dvh-7rem))))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[28px] border border-foreground/10 bg-surface shadow-[0_34px_70px_-30px_rgba(0,0,0,0.45)] sm:w-[600px]"
      >
        <header className="flex items-center gap-3 border-b border-foreground/10 py-3 pl-5 pr-3">
          <BotAvatar className="size-12 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-semibold leading-tight">{site.assistant}</h2>
            <p className="truncate text-sm text-muted">Ask about {site.name}&apos;s CV</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close chat"
            className="grid size-11 shrink-0 place-items-center rounded-full transition-colors duration-150 hover:bg-foreground/[0.06]"
          >
            <CloseIcon className="size-5" />
          </button>
        </header>

        <div ref={log} role="log" aria-live="polite" aria-busy={busy} className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 px-2 py-6 text-center">
              <BotAvatar className="size-24" />
              <p className="max-w-sm text-lg leading-relaxed text-muted">
                Ask anything about {site.name}&apos;s skills, projects or education.
              </p>
            </div>
          )}

          {messages.map(({ role, content, links }, index) => (
            <div key={index} className={`flex items-end gap-2.5 ${role === "user" ? "justify-end" : ""}`}>
              {role === "assistant" && <BotAvatar className="size-12 shrink-0" />}
              <div
                className={`min-w-0 max-w-[85%] rounded-[20px] px-4 py-3 text-base leading-relaxed ${
                  role === "user" ? "bg-accent text-on-accent" : "bg-foreground/[0.06]"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{content}</p>
                {links && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {links.map(({ label, href }) => (
                      <li key={href}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-9 items-center rounded-full border border-foreground/15 bg-surface px-3.5 text-sm font-semibold transition-[border-color] duration-150 hover:border-foreground/40"
                        >
                          {label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}

          {waiting && (
            <div className="flex items-end gap-2.5">
              <BotAvatar className="size-12 shrink-0" />
              <p aria-label="Writing a reply" className="flex w-fit gap-1.5 rounded-[20px] bg-foreground/[0.06] px-4 py-4">
                {[0, 160, 320].map((delay) => (
                  <span
                    key={delay}
                    aria-hidden
                    className="chat-dot size-1.5 rounded-full bg-foreground"
                    style={{ "--delay": `${delay}ms` } as CSSProperties}
                  />
                ))}
              </p>
            </div>
          )}

          {error && <p className="px-2 text-sm leading-relaxed text-accent">{error}</p>}

          {!busy && remaining.length > 0 && (messages.length === 0 ? questionButtons : (
            // Closed by default, so the newest answer stays in view. The key closes it after each message.
            <details key={messages.length} className="pt-2">
              <summary className="flex min-h-11 cursor-pointer items-center px-2 text-[15px] font-semibold text-muted transition-colors duration-150 hover:text-foreground">
                More questions
              </summary>
              {questionButtons}
            </details>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-foreground/10 p-4">
          <textarea
            ref={input}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleInputKeyDown}
            maxLength={MAX_CHARS}
            rows={3}
            aria-label="Your question"
            placeholder={`Ask ${site.assistant} a question`}
            autoComplete="off"
            className="min-w-0 flex-1 resize-none rounded-[20px] border border-foreground/10 bg-background px-4 py-3 text-base leading-relaxed outline-none transition-[border-color] duration-200 placeholder:text-muted/80 focus:border-foreground/40"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label="Send"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-on-accent transition-[opacity,transform] duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
          >
            <ArrowRightIcon className="size-5" />
          </button>
        </form>
      </div>

      <button
        ref={launcher}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls="chat-panel"
        aria-label={open ? "Close chat" : `Ask ${site.assistant} about ${site.name}`}
        className="chat-launcher grid size-16 place-items-center overflow-hidden rounded-full bg-accent text-on-accent shadow-[0_18px_40px_-16px_rgba(0,0,0,0.55)]"
      >
        {open ? <CloseIcon className="size-6" /> : <BotAvatar className="size-16" />}
      </button>
    </div>
  );
}
