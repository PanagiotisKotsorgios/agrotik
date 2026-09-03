"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { adminDeleteProduct } from "@/lib/actions/products";

export function AdminDeleteProduct({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <>
      <Button
        type="button"
        variant="danger"
        size="sm"
        icon="trash"
        disabled={pending}
        onClick={() =>
          start(async () => {
            if (!confirm(`Οριστική διαγραφή του προϊόντος "${name}"; Ενεργές καταχωρήσεις θα εμποδίσουν τη διαγραφή.`)) return;
            setError(null);
            const res = await adminDeleteProduct(id);
            if (!res.ok) return setError(res.error);
            router.refresh();
          })
        }
      >
        Διαγραφή
      </Button>
      {error && <p className="text-xs text-red-700 mt-1" role="alert">{error}</p>}
    </>
  );
}
