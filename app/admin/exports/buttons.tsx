"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { exportCSV } from "@/lib/actions/admin";

function download(name: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ExportButtons() {
  const [pending, start] = useTransition();
  const stamp = () => new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        icon={pending ? "spinner" : "download"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await exportCSV("users");
            if (res.ok) download(`agrotik-users-${stamp()}.csv`, res.csv);
          })
        }
      >
        Χρήστες
      </Button>
      <Button
        variant="secondary"
        icon={pending ? "spinner" : "download"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await exportCSV("listings");
            if (res.ok) download(`agrotik-listings-${stamp()}.csv`, res.csv);
          })
        }
      >
        Καταχωρήσεις
      </Button>
    </div>
  );
}
