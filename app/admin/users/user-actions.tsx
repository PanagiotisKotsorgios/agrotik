"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import {
  deleteUserPermanently,
  sendAdminNotification,
  setUserActive,
  setUserPublic,
  setUserRole,
} from "@/lib/actions/admin";
import { sendMessage } from "@/lib/actions/messages";
import type { ActionResult } from "@/lib/actions/auth";

type Panel = "message" | "notification" | "role" | null;

export function UserActions({
  userId,
  displayName,
  isActive,
  isPublic,
  role,
  isSelf,
}: {
  userId: string;
  displayName: string;
  isActive: boolean;
  isPublic: boolean;
  role: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [panel, setPanel] = useState<Panel>(null);
  const [message, setMessage] = useState("");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [selectedRole, setSelectedRole] = useState(role);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  function run(action: () => Promise<ActionResult>, success: string, onSuccess?: () => void) {
    start(async () => {
      setFeedback(null);
      const result = await action();
      if (!result.ok) {
        setFeedback({ tone: "error", text: result.error });
        return;
      }
      onSuccess?.();
      setFeedback({ tone: "ok", text: success });
      router.refresh();
    });
  }

  function toggle(next: Exclude<Panel, null>) {
    setFeedback(null);
    setPanel((current) => (current === next ? null : next));
  }

  function permanentlyDelete() {
    const confirmation = window.prompt(
      `Η διαγραφή του λογαριασμού «${displayName}» είναι οριστική και αφαιρεί όλα τα δεδομένα του. Πληκτρολόγησε ΔΙΑΓΡΑΦΗ για επιβεβαίωση.`,
    );
    if (confirmation !== "ΔΙΑΓΡΑΦΗ") return;
    run(
      () => deleteUserPermanently(userId),
      "Ο λογαριασμός διαγράφηκε οριστικά.",
      () => setPanel(null),
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-brand-border">
      <div className="flex flex-wrap gap-2">
        {!isSelf && (
          <>
            <Button type="button" variant="secondary" size="sm" icon="chat" disabled={pending} onClick={() => toggle("message")}>
              Μήνυμα
            </Button>
            <Button type="button" variant="secondary" size="sm" icon="bell" disabled={pending} onClick={() => toggle("notification")}>
              Ειδοποίηση
            </Button>
            <Button type="button" variant="secondary" size="sm" icon="shield" disabled={pending} onClick={() => toggle("role")}>
              Ρόλος
            </Button>
            {role !== "admin" && (
              <Button
                type="button"
                variant={isPublic ? "outline" : "primary"}
                size="sm"
                icon={isPublic ? "eyeOff" : "eye"}
                disabled={pending}
                onClick={() =>
                  run(
                    () => setUserPublic(userId, !isPublic),
                    isPublic
                      ? "Το προφίλ αφαιρέθηκε από τις δημόσιες σελίδες."
                      : "Το προφίλ είναι πλέον δημόσιο και εμφανίζεται στην αναζήτηση.",
                  )
                }
              >
                {isPublic ? "Απόκρυψη προφίλ" : "Δημοσίευση προφίλ"}
              </Button>
            )}
            <Button
              type="button"
              variant={isActive ? "outline" : "primary"}
              size="sm"
              icon={isActive ? "lock" : "unlock"}
              disabled={pending}
              onClick={() => run(() => setUserActive(userId, !isActive), isActive ? "Ο λογαριασμός ανεστάλη." : "Ο λογαριασμός ενεργοποιήθηκε.")}
            >
              {isActive ? "Αναστολή" : "Ενεργοποίηση"}
            </Button>
            <Button type="button" variant="danger" size="sm" icon="trash" disabled={pending} onClick={permanentlyDelete}>
              Οριστική διαγραφή
            </Button>
          </>
        )}
        {isSelf && <span className="text-xs text-brand-muted py-2">Ο δικός σου λογαριασμός προστατεύεται από αναστολή, αλλαγή ρόλου και διαγραφή.</span>}
      </div>

      {panel === "message" && (
        <form
          className="mt-4 max-w-2xl rounded-xl bg-brand-bg border border-brand-border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => sendMessage({ recipient_id: userId, body: message }),
              "Το μήνυμα στάλθηκε.",
              () => setMessage(""),
            );
          }}
        >
          <Label htmlFor={`message-${userId}`}>Προσωπικό μήνυμα προς {displayName}</Label>
          <Textarea
            id={`message-${userId}`}
            rows={3}
            value={message}
            maxLength={4000}
            placeholder="Γράψε το μήνυμα…"
            onChange={(event) => setMessage(event.target.value)}
          />
          <div className="mt-3 flex justify-end">
            <Button type="submit" size="sm" icon={pending ? "spinner" : "send"} disabled={pending || !message.trim()}>
              Αποστολή μηνύματος
            </Button>
          </div>
        </form>
      )}

      {panel === "notification" && (
        <form
          className="mt-4 max-w-2xl rounded-xl bg-brand-bg border border-brand-border p-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => sendAdminNotification({ userId, title: noticeTitle, body: noticeBody }),
              "Η ειδοποίηση στάλθηκε.",
              () => {
                setNoticeTitle("");
                setNoticeBody("");
              },
            );
          }}
        >
          <div>
            <Label htmlFor={`notice-title-${userId}`}>Τίτλος ειδοποίησης</Label>
            <Input
              id={`notice-title-${userId}`}
              value={noticeTitle}
              maxLength={120}
              placeholder="Σημαντική ενημέρωση"
              onChange={(event) => setNoticeTitle(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`notice-body-${userId}`}>Κείμενο</Label>
            <Textarea
              id={`notice-body-${userId}`}
              rows={3}
              value={noticeBody}
              maxLength={2000}
              placeholder="Γράψε την ενημέρωση που θα εμφανιστεί στις ειδοποιήσεις του χρήστη…"
              onChange={(event) => setNoticeBody(event.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" icon={pending ? "spinner" : "bell"} disabled={pending || !noticeTitle.trim() || !noticeBody.trim()}>
              Αποστολή ειδοποίησης
            </Button>
          </div>
        </form>
      )}

      {panel === "role" && (
        <form
          className="mt-4 max-w-md rounded-xl bg-brand-bg border border-brand-border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => setUserRole(userId, selectedRole), "Ο ρόλος ενημερώθηκε.");
          }}
        >
          <Label htmlFor={`role-${userId}`}>Ρόλος χρήστη</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select id={`role-${userId}`} value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
              <option value="farmer">Αγρότης</option>
              <option value="fisher">Αλιέας</option>
              <option value="stockbreeder">Κτηνοτρόφος</option>
              <option value="beekeeper">Μελισσοκόμος</option>
              <option value="farmer_fisher">Αγρότης & Αλιέας</option>
              <option value="farmer_stockbreeder">Αγρότης & Κτηνοτρόφος</option>
              <option value="farmer_beekeeper">Αγρότης & Μελισσοκόμος</option>
              <option value="merchant">Έμπορος</option>
              <option value="factory">Εργοστάσιο</option>
              <option value="agri_supplier">Γεωπόνος / Αγροεφόδια</option>
              <option value="admin">Διαχειριστής</option>
            </Select>
            <Button type="submit" size="sm" disabled={pending || selectedRole === role}>Αποθήκευση</Button>
          </div>
        </form>
      )}

      {feedback && (
        <div className={`mt-3 text-sm font-semibold ${feedback.tone === "ok" ? "text-emerald-800" : "text-red-700"}`} role="status">
          {feedback.text}
        </div>
      )}
    </div>
  );
}
