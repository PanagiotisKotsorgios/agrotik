import { redirect } from "next/navigation";

// Renamed to /dashboard/network
export default function FavoritesRedirect() {
  redirect("/dashboard/network");
}
