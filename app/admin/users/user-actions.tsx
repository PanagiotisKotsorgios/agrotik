"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setUserActive, promoteToAdmin } from "@/lib/actions/admin";

export function UserActions({
  userId,
  isActive,
  role,
}: {
  userId: string;
  isActive: boolean;
  role: string;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex gap-2">
      {role !== "admin" && (
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => start(() => promoteToAdmin(userId).then(() => location.reload()))}
        >
          Promote → admin
        </Button>
      )}
      <Button
        variant={isActive ? "danger" : "primary"}
        size="sm"
        disabled={pending}
        onClick={() => start(() => setUserActive(userId, !isActive).then(() => location.reload()))}
      >
        {isActive ? "Suspend" : "Ενεργοποίηση"}
      </Button>
    </div>
  );
}
