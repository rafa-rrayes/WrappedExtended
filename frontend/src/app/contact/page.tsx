"use client";

import Link from "next/link";
import { useState } from "react";

export default function ContactPage() {
  const [formState, setFormState] = useState<"idle" | "sending" | "sent">("idle");
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormState("sending");
    // Build mailto link as a simple no-backend solution
    const mailto = `mailto:support@wrapex.app?subject=${encodeURIComponent(
      `[${form.subject || "General"}] from ${form.name}`
    )}&body=${encodeURIComponent(
      `From: ${form.name} (${form.email})\n\n${form.message}`
    )}`;
    window.location.href = mailto;
    setTimeout(() => setFormState("sent"), 500);
  }

  return (
    <main className="pt-14">
      <section className="max-w-[800px] mx-auto px-6 py-24">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold mb-2">
          Contact Us
        </h1>
        <p className="text-text-secondary mb-12">
          Have a question, issue, or feedback? We&apos;d love to hear from you.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <InfoCard icon="@" title="Email" detail="support@wrapex.app" />
          <InfoCard icon="?" title="Support" detail="Typically respond within 24h" />
          <InfoCard icon="!" title="Bug Reports" detail="Include your upload ID if possible" />
        </div>

        {formState === "sent" ? (
          <div className="bg-bg-card/60 border border-green/30 rounded-[var(--radius-card)] p-8 text-center">
            <div className="text-3xl mb-4">&#10003;</div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold mb-2">
              Email client opened
            </h2>
            <p className="text-text-secondary text-sm">
              Your email client should have opened with the message pre-filled. If it
              didn&apos;t, send your message directly to{" "}
              <span className="text-green">support@wrapex.app</span>.
            </p>
            <button
              onClick={() => { setFormState("idle"); setForm({ name: "", email: "", subject: "", message: "" }); }}
              className="mt-6 text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Name" name="name" type="text" value={form.name} onChange={handleChange} required />
              <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Subject</label>
              <select
                name="subject"
                value={form.subject}
                onChange={handleChange}
                className="w-full bg-bg-card/60 border border-border rounded-[var(--radius-sm)] px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-green/50 transition-colors appearance-none"
              >
                <option value="General">General Inquiry</option>
                <option value="Support">Technical Support</option>
                <option value="Billing">Billing &amp; Payments</option>
                <option value="Privacy">Privacy &amp; Data</option>
                <option value="Bug">Bug Report</option>
                <option value="Feedback">Feedback</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Message</label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                required
                rows={6}
                className="w-full bg-bg-card/60 border border-border rounded-[var(--radius-sm)] px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-green/50 transition-colors resize-none"
                placeholder="Tell us what's on your mind..."
              />
            </div>

            <button
              type="submit"
              disabled={formState === "sending"}
              className="bg-green hover:bg-green/90 text-bg-deep font-semibold px-8 py-3 rounded-full transition-all disabled:opacity-50"
            >
              {formState === "sending" ? "Opening email..." : "Send Message"}
            </button>
          </form>
        )}
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-text-muted">
        <div className="flex items-center justify-center gap-6">
          <Link href="/terms" className="hover:text-text-secondary transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-text-secondary transition-colors">
            Privacy
          </Link>
          <Link href="/contact" className="hover:text-text-secondary transition-colors">
            Contact
          </Link>
        </div>
      </footer>
    </main>
  );
}

function InfoCard({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return (
    <div className="bg-bg-card/60 border border-border rounded-[var(--radius-card)] p-5 text-center hover:border-green/30 transition-colors">
      <div className="w-10 h-10 rounded-full bg-green/20 text-green font-bold flex items-center justify-center mx-auto mb-3 text-lg">
        {icon}
      </div>
      <h3 className="font-[family-name:var(--font-display)] font-bold text-sm mb-1">{title}</h3>
      <p className="text-xs text-text-muted">{detail}</p>
    </div>
  );
}

function Field({
  label,
  name,
  type,
  value,
  onChange,
  required,
}: {
  label: string;
  name: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-text-secondary mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full bg-bg-card/60 border border-border rounded-[var(--radius-sm)] px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-green/50 transition-colors"
      />
    </div>
  );
}
