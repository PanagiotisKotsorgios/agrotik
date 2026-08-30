"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approveProduct, rejectProduct } from "@/lib/actions/admin";

export function ProductActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <Button
        variant="primary"
        size="sm"
        disabled={pending}
        onClick={() => start(() => approveProduct(id).then(() => location.reload()))}
      >
        Έγκριση
      </Button>
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() => start(() => rejectProduct(id).then(() => location.reload()))}
      >
        Απόρριψη
      </Button>
    </div>
  );
}
