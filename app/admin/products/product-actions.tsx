"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { approveProduct, rejectProduct } from "@/lib/actions/admin";

export function ProductActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const run = (action: () => ReturnType<typeof approveProduct>) => start(async () => {
    setError(null);
    const result = await action();
    if (!result.ok) return setError(result.error);
    router.refresh();
  });
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="primary"
        size="sm"
        disabled={pending}
        onClick={() => run(() => approveProduct(id))}
      >
        Έγκριση
      </Button>
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() => run(() => rejectProduct(id))}
      >
        Απόρριψη
      </Button>
      {error && <p className="w-full text-xs text-red-700" role="alert">{error}</p>}
    </div>
  );
}
