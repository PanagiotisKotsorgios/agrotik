"use client";
import { useState, useTransition } from "react";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { sendContactMessage } from "@/lib/actions/contact";

export function ContactForm() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4"
      action={(fd) =>
        start(async () => {
          setMsg(null);
          const res = await sendContactMessage(fd);
          if (!res.ok) return setMsg({ ok: false, text: res.error });
          setMsg({ ok: true, text: "Ευχαριστούμε — το μήνυμά σου εστάλη." });
          (document.getElementById("contact-form") as HTMLFormElement | null)?.reset();
        })
      }
      id="contact-form"
    >
      <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <Label htmlFor="company-fax">Company fax</Label>
        <Input id="company-fax" name="company_fax" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="c-name">Όνομα</Label>
          <Input id="c-name" name="name" required autoComplete="name" />
        </div>
        <div>
          <Label htmlFor="c-email">Email</Label>
          <Input id="c-email" name="email" type="email" required autoComplete="email" />
        </div>
      </div>
      <div>
        <Label htmlFor="c-phone">Τηλέφωνο (προαιρετικό)</Label>
        <Input id="c-phone" name="phone" type="tel" autoComplete="tel" />
      </div>
      <div>
        <Label htmlFor="c-subject">Θέμα</Label>
        <Input id="c-subject" name="subject" required placeholder="π.χ. Ερώτηση για την εγγραφή" />
      </div>
      <div>
        <Label htmlFor="c-body">Μήνυμα</Label>
        <Textarea id="c-body" name="body" rows={6} required minLength={10} maxLength={4000} placeholder="Γράψε εδώ το μήνυμά σου…" />
      </div>
      {msg && (
        <p className={"inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm " +
          (msg.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200")}>
          <Icon name={msg.ok ? "ok" : "triangleAlert"} /> {msg.text}
        </p>
      )}
      <Button type="submit" disabled={pending} icon={pending ? "spinner" : "send"} size="lg" className="w-full sm:w-auto">
        {pending ? "Αποστολή…" : "Αποστολή μηνύματος"}
      </Button>
    </form>
  );
}
