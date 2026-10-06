"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, Mail } from "lucide-react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { trackEvent } from "@/lib/analytics";

export function NewsletterCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const reducedMotion = useReducedMotion();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "homepage" }),
      });
      if (!res.ok) throw new Error("signup failed");
      localStorage.setItem("genrise:newsletter-subscribed", "1");
      trackEvent("newsletter_signup", { source: "homepage" });
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <section className="py-10 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }
          }
          className="flex flex-col items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center sm:p-10"
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Check className="size-6" />
          </div>
          <h3 className="font-heading text-xl font-bold sm:text-2xl">You&rsquo;re in.</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            We&rsquo;ll email when new tools launch. No spam, unsubscribe anytime.
          </p>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }
        }
        className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm sm:p-10"
      >
        <div className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Mail className="size-6" />
          </div>

          <div>
            <h3 className="font-heading text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              New tools, in your inbox
            </h3>
            <p className="mt-2 text-pretty text-sm text-muted-foreground sm:text-base">
              We email when new tools drop. No spam, no sales pitches, just tools.
            </p>
          </div>

          <form
            onSubmit={submit}
            className="flex w-full flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address"
              className="h-12 w-full flex-1 rounded-lg border border-border bg-background px-4 text-base outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 sm:h-11 sm:text-sm"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="h-12 w-full shrink-0 rounded-lg bg-foreground px-6 text-base font-semibold text-background transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 sm:h-11 sm:w-auto sm:text-sm"
            >
              {status === "loading" ? "Joining…" : "Notify me"}
            </button>
          </form>

          {status === "error" && (
            <p className="text-sm text-destructive">
              Something went wrong. Please try again.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Free forever. Unsubscribe anytime.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
