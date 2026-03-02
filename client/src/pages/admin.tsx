import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLogin from "./admin-login";
import AdminDashboard from "./admin-dashboard";

export default function Admin() {
  const { data: session, isLoading, error } = useQuery<{ id: string; username: string }>({
    queryKey: ["/api/admin/session"],
    retry: false,
  });

  const [user, setUser] = useState<{ id: string; username: string } | null>(null);

  useEffect(() => {
    if (session && !error) {
      setUser(session);
    }
  }, [session, error]);

  const handleLogin = (userData: { id: string; username: string }) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {}
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-96 w-96 rounded-md" />
      </div>
    );
  }

  if (!user) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return <AdminDashboard user={user} onLogout={handleLogout} />;
}
