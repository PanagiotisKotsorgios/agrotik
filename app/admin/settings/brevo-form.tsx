"use client";
import { useState, useTransition } from "react";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { saveBrevoSettings, sendBrevoTest } from "@/lib/actions/admin";
import type { BrevoSettings, BrevoTemplateKey, EmailTemplate } from "@/lib/brevo";

export function BrevoSettingsForm({
  initial,
  hasApiKey,
}: {
  initial: BrevoSettings;
  hasApiKey: boolean;
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [apiKey, setApiKey] = useState(initial.api_key);
  const [showKey, setShowKey] = useState(false);
  const [senderEmail, setSenderEmail] = useState(initial.sender_email);
  const [senderName, setSenderName] = useState(initial.sender_name);
  const [tpl, setTpl] = useState({ ...initial.templates });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [pending, start] = useTransition();
  const [testing, startTest] = useTransition();

  return (
    <div className="space-y-6">
      <label className="flex items-center gap-3 select-none">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-4 h-4 rounded border-brand-border accent-brand-dark"
        />
        <span className="font-medium">Ενεργοποίηση αποστολής email μέσω Brevo</span>
      </label>

      <div>
        <Label htmlFor="brevo-key">Brevo API key</Label>
        <div className="relative">
          <Input
            id="brevo-key"
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasApiKey ? "Αποθηκευμένο — γράψε νέο μόνο για αντικατάσταση" : "xkeysib-…"}
            autoComplete="off"
            className="pr-11 figures"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-brand-muted hover:text-brand-dark"
            aria-label={showKey ? "Απόκρυψη" : "Εμφάνιση"}
          >
            <Icon name={showKey ? "eyeOff" : "eye"} />
          </button>
        </div>
        <p className="text-xs text-brand-muted mt-1">
          Βρες το στο{" "}
          <a
            href="https://app.brevo.com/settings/keys/api"
            target="_blank"
            rel="noreferrer"
            className="text-brand-mid hover:underline"
          >
            Brevo → Settings → API Keys
          </a>
          . Αποθηκεύεται μόνο server-side.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sender-email">Sender email</Label>
          <Input
            id="sender-email"
            type="email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="sender-name">Sender name</Label>
          <Input
            id="sender-name"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
          />
        </div>
      </div>

      <div>
        <div className="eyebrow mb-2">Ενεργά templates</div>
        <div className="grid sm:grid-cols-2 gap-2">
          {([
            { key: "price_changed", label: "Αλλαγή τιμής σε αγαπημένο" },
            { key: "new_better_price", label: "Νέος αγοραστής με καλύτερη τιμή" },
            { key: "new_message", label: "Νέο μήνυμα από άλλον χρήστη" },
            { key: "welcome", label: "Καλωσόρισμα νέου χρήστη" },
            { key: "password_reset", label: "Επαναφορά κωδικού" },
            { key: "contact", label: "Μηνύματα φόρμας επικοινωνίας" },
            { key: "admin_notice", label: "Ειδοποιήσεις διαχειριστή" },
          ] satisfies Array<{ key: BrevoTemplateKey; label: string }>).map((t) => (
            <label
              key={t.key}
              className="flex items-center gap-3 p-3 rounded-md border border-brand-border bg-brand-bg cursor-pointer"
            >
              <input
                type="checkbox"
                checked={!!tpl[t.key]}
                onChange={(e) => setTpl((prev) => ({ ...prev, [t.key]: e.target.checked }))}
                className="w-4 h-4 accent-brand-dark"
              />
              <span className="text-sm">{t.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Editable welcome template */}
      <TemplateEditor
        title="Καλωσόρισμα νέου χρήστη"
        initial={initial.welcome_template ?? { subject: "Καλωσόρισες στο AGROTIK", heading: "Καλωσόρισες!", body_html: "" }}
        onSave={async (val) => {
          const res = await saveBrevoSettings({ welcome_template: val });
          setMsg(res.ok ? { ok: true, text: "Το template αποθηκεύτηκε" } : { ok: false, text: res.error });
        }}
      />

      <TemplateEditor
        title="Αλλαγή τιμής σε αγαπημένο"
        initial={initial.price_changed_template ?? { subject: "AGROTIK · Αλλαγή τιμής", heading: "Νέα τιμή σε αγαπημένο", body_html: "" }}
        onSave={async (val) => {
          const res = await saveBrevoSettings({ price_changed_template: val });
          setMsg(res.ok ? { ok: true, text: "Το template αποθηκεύτηκε" } : { ok: false, text: res.error });
        }}
      />

      <TemplateEditor
        title="Νέο μήνυμα"
        initial={initial.new_message_template ?? { subject: "AGROTIK · Νέο μήνυμα", heading: "Νέο μήνυμα", body_html: "" }}
        onSave={async (val) => {
          const res = await saveBrevoSettings({ new_message_template: val });
          setMsg(res.ok ? { ok: true, text: "Το template αποθηκεύτηκε" } : { ok: false, text: res.error });
        }}
      />

      <TemplateEditor
        title="Επαναφορά κωδικού"
        initial={initial.password_reset_template ?? { subject: "AGROTIK · Επαναφορά κωδικού", heading: "Επαναφορά κωδικού", body_html: "" }}
        onSave={async (val) => {
          const res = await saveBrevoSettings({ password_reset_template: val });
          setMsg(res.ok ? { ok: true, text: "Το template αποθηκεύτηκε" } : { ok: false, text: res.error });
        }}
      />

      {msg && (
        <p
          className={
            "text-sm inline-flex items-center gap-2 px-3 py-2 rounded-md border " +
            (msg.ok
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-700")
          }
        >
          <Icon name={msg.ok ? "ok" : "triangleAlert"} /> {msg.text}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-brand-border">
        <Button
          disabled={pending}
          icon={pending ? "spinner" : "check"}
          onClick={() =>
            start(async () => {
              setMsg(null);
              const res = await saveBrevoSettings({
                enabled,
                ...(apiKey.trim() ? { api_key: apiKey } : {}),
                sender_email: senderEmail,
                sender_name: senderName,
                templates: tpl,
              });
              setMsg(res.ok ? { ok: true, text: "Αποθηκεύτηκε" } : { ok: false, text: res.error });
            })
          }
        >
          {pending ? "Αποθήκευση…" : "Αποθήκευση"}
        </Button>

        <div className="flex items-center gap-2 ml-auto">
          <Input
            type="email"
            placeholder="test@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="w-52"
          />
          <Button
            variant="secondary"
            disabled={testing || !testEmail}
            icon={testing ? "spinner" : "send"}
            onClick={() =>
              startTest(async () => {
                setMsg(null);
                const saved = await saveBrevoSettings({
                  enabled,
                  ...(apiKey.trim() ? { api_key: apiKey } : {}),
                  sender_email: senderEmail,
                  sender_name: senderName,
                  templates: tpl,
                });
                if (!saved.ok) {
                  setMsg({ ok: false, text: saved.error });
                  return;
                }
                const res = await sendBrevoTest(testEmail);
                setMsg(res.ok ? { ok: true, text: "Test email εστάλη" } : { ok: false, text: res.error });
              })
            }
          >
            {testing ? "Αποστολή…" : "Δοκιμαστικό email"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TemplateEditor({
  title,
  initial,
  onSave,
}: {
  title: string;
  initial: EmailTemplate;
  onSave: (val: EmailTemplate) => Promise<void>;
}) {
  const [val, setVal] = useState<EmailTemplate>(initial);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <details className="border border-brand-border rounded-md group" open={open}>
      <summary
        className="cursor-pointer list-none flex items-center justify-between px-4 py-3 bg-brand-bg/50 hover:bg-brand-bg"
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
      >
        <div className="flex items-center gap-2">
          <Icon name="envelope" className="text-brand-dark" />
          <span className="font-semibold text-brand-dark">Template · {title}</span>
        </div>
        <Icon name="plus" className={"transition-transform " + (open ? "rotate-45" : "")} />
      </summary>
      {open && (
        <div className="p-4 space-y-3 border-t border-brand-border">
          <div>
            <Label>Θέμα (subject)</Label>
            <Input value={val.subject} onChange={(e) => setVal({ ...val, subject: e.target.value })} />
          </div>
          <div>
            <Label>Επικεφαλίδα (heading)</Label>
            <Input value={val.heading} onChange={(e) => setVal({ ...val, heading: e.target.value })} />
          </div>
          <div>
            <Label>Σώμα (HTML — επιτρέπονται &lt;p&gt;, &lt;a&gt;, &lt;strong&gt;, &lt;br/&gt;)</Label>
            <Textarea rows={10} value={val.body_html} onChange={(e) => setVal({ ...val, body_html: e.target.value })} className="font-mono text-[13px]" />
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={pending}
              icon={pending ? "spinner" : "check"}
              onClick={() => start(() => onSave(val))}
            >
              {pending ? "Αποθήκευση…" : "Αποθήκευση template"}
            </Button>
          </div>
        </div>
      )}
    </details>
  );
}
