import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import StaffDashboardClient from "./StaffDashboardClient";

export default async function StaffDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Pass real session fields to the client component
  return (
    <StaffDashboardClient
      name={session.user?.name ?? null}
      email={session.user?.email ?? null}
      department={(session.user as any)?.department ?? null}
      zone={(session.user as any)?.zone ?? null}
    />
  );
}
