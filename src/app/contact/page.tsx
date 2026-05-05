import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the optionerd team. Questions, feedback, partnerships, or bug reports — we read every message.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-3 py-8 md:py-12">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Contact</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Questions, feedback, bug reports, partnership inquiries — drop a note and
        we&apos;ll get back to you. You can also email{" "}
        <a
          href="mailto:contact@optionerd.com"
          className="font-mono text-foreground underline underline-offset-2 hover:no-underline"
        >
          contact@optionerd.com
        </a>{" "}
        directly.
      </p>
      <div className="mt-6">
        <ContactForm />
      </div>
    </div>
  );
}
