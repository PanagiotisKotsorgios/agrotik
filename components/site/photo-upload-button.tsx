"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { createSupabaseBrowser } from "@/lib/supabase/browser";

const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

interface Props {
  bucket?: string;
  onUploaded: (result: { url: string; path: string }) => void;
  disabled?: boolean;
  label?: string;
}

/**
 * File input styled as a button. On selection, uploads the chosen
 * image to Supabase Storage under <user_id>/<timestamp>-<name> and
 * hands the caller the resulting public URL (+ storage path).
 * No admin approval, no server round trip — the browser client uses
 * the RLS insert policy on storage.objects.
 */
export function PhotoUploadButton({ bucket = "listing-photos", onUploaded, disabled, label }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setError(null);

    if (!ACCEPTED_MIME.includes(file.type)) {
      setError("Επιτρέπονται μόνο JPEG, PNG ή WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Το αρχείο ξεπερνά τα 5 MB. Μείωσε το μέγεθος και ξαναδοκίμασε.");
      return;
    }

    setUploading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Απαιτείται σύνδεση για ανέβασμα φωτογραφίας.");
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      onUploaded({ url: pub.publicUrl, path });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Άγνωστο σφάλμα ανεβάσματος");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="inline-flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME.join(",")}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        icon={uploading ? "spinner" : "image"}
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Ανέβασμα…" : label ?? "Ανέβασε φωτογραφία"}
      </Button>
      {error && (
        <span className="text-xs text-red-700 inline-flex items-center gap-1" role="alert">
          <Icon name="triangleAlert" /> {error}
        </span>
      )}
    </div>
  );
}
