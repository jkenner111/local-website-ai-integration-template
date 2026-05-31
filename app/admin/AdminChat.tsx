"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useState } from "react";

const SUGGESTIONS = [
  "What events are coming up?",
  "Show me what's on the membership page.",
  "Which pages does the site have?",
  "When's our next board meeting?",
];

const ACCEPTED_TYPES =
  ".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx";

type PendingFile = {
  id: string;
  file: File;
};

type UploadResult = {
  accepted: Array<{
    originalName: string;
    storedName: string;
    path: string;
    size: number;
    type: string;
  }>;
  rejected: Array<{ name: string; reason: string }>;
};

export function AdminChat() {
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/admin/chat" }),
  });
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const extras = Array.from(list).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
    }));
    setPending((prev) => [...prev, ...extras].slice(0, 10));
  };

  const removePending = (id: string) => {
    setPending((prev) => prev.filter((p) => p.id !== id));
  };

  const uploadPending = async (): Promise<UploadResult["accepted"]> => {
    if (pending.length === 0) return [];
    const form = new FormData();
    for (const p of pending) form.append("files", p.file, p.file.name);
    const res = await fetch("/api/admin/upload", {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status}`);
    }
    return (await res.json() as UploadResult).accepted;
  };

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed && pending.length === 0) return;

    let suffix = "";
    if (pending.length > 0) {
      setIsUploading(true);
      setUploadError(null);
      try {
        const uploaded = await uploadPending();
        if (uploaded.length > 0) {
          const names = uploaded
            .map((u) => `${u.originalName} (${u.path})`)
            .join(", ");
          suffix = `\n\n[Attached files: ${names}]`;
        }
        setPending([]);
      } catch (e) {
        setUploadError(
          e instanceof Error ? e.message : "Upload failed. Try again.",
        );
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const payload = (trimmed + suffix).trim();
    sendMessage({ text: payload || "(attachments only)" });
    setInput("");
  };

  const openPicker = () => fileInputRef.current?.click();

  const canSend =
    (status === "ready" || status === "error") &&
    !isUploading &&
    (input.trim().length > 0 || pending.length > 0);

  return (
    <div className="mt-8 flex flex-col gap-4">
      {messages.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <div className="text-sm font-medium text-gray-900">
            Ask me anything about the site
          </div>
          <div className="mt-1 text-xs text-gray-600">
            I can read pages, events, and the navigation. I can&rsquo;t edit
            anything yet — editing comes in the next phase. You can attach
            photos or documents now and I&rsquo;ll reference them in the
            conversation.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:border-gray-400 hover:bg-gray-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>

      {(status === "submitted" || status === "streaming" || isUploading) && (
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gray-400" />
          {isUploading
            ? "Uploading…"
            : status === "submitted"
              ? "Thinking…"
              : "Answering…"}
          {status === "streaming" && (
            <button
              type="button"
              onClick={() => stop()}
              className="underline hover:text-gray-700"
            >
              Stop
            </button>
          )}
        </div>
      )}

      <div className="sticky bottom-4 flex flex-col gap-2">
        {uploadError && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
            {uploadError}
          </div>
        )}
        {pending.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pending.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 ring-1 ring-gray-200"
              >
                <span className="max-w-[220px] truncate">{p.file.name}</span>
                <span className="text-gray-400">
                  ({Math.round(p.file.size / 1024)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => removePending(p.id)}
                  className="ml-1 text-gray-400 hover:text-gray-700"
                  aria-label={`Remove ${p.file.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="flex gap-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
            className="hidden"
          />
          <button
            type="button"
            title="Attach a photo or document (jpg/png/gif/webp/pdf/doc/docx, 10MB each)"
            onClick={openPicker}
            className="rounded-lg border border-gray-300 bg-white px-3 text-gray-500 hover:border-gray-400 hover:text-gray-700"
          >
            <PaperclipIcon />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              pending.length > 0
                ? "Add a note or send files on their own…"
                : "Ask about the site…"
            }
            disabled={status !== "ready" && status !== "error"}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={!canSend}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-400"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

function PaperclipIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.98 8.86l-8.21 8.21a2 2 0 0 1-2.83-2.83l7.07-7.07" />
    </svg>
  );
}

type ChatMessage = ReturnType<typeof useChat>["messages"][number];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={
        isUser
          ? "max-w-[80%] self-end rounded-lg bg-gray-900 px-4 py-2 text-sm text-white"
          : "max-w-[85%] self-start rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900"
      }
    >
      {message.parts.map((part, idx) => {
        if (part.type === "text") {
          return (
            <div key={idx} className="whitespace-pre-wrap">
              {part.text}
            </div>
          );
        }
        if (part.type?.startsWith("tool-")) {
          const toolName = part.type.replace(/^tool-/, "");
          // A tool part is a discriminated union on `state`. Tools that return
          // an { error } object resolve as "output-available" (a *successful*
          // call by SDK semantics) and a thrown/aborted tool resolves as
          // "output-error" — so checking only for "output-available" would
          // report a failed action as "done". Surface real failures instead.
          const p = part as { state?: string; errorText?: string; output?: unknown };
          const outputError =
            p.output && typeof p.output === "object" && "error" in p.output
              ? String((p.output as { error: unknown }).error)
              : null;
          const failure =
            p.state === "output-error"
              ? p.errorText || "the action did not complete"
              : outputError;
          const settled = p.state === "output-available" || p.state === "output-error";
          return (
            <div
              key={idx}
              className={
                failure
                  ? "mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600"
                  : "mt-2 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-500"
              }
            >
              <span className="font-mono">{toolName}</span>
              {failure ? (
                <span className="ml-1">— failed: {failure}</span>
              ) : settled ? (
                <span className="ml-1 text-gray-400">— done</span>
              ) : (
                <span className="ml-1 text-gray-400">— running…</span>
              )}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
