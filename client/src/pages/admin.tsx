import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, LogIn, Lock } from "lucide-react";
import AdminDashboard from "./admin-dashboard";

export default function Admin() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-96 w-96 rounded-md" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "1.5s" }} />

        <Card className="w-full max-w-md border-0 smooth-shadow overflow-hidden animate-scale-in relative">
          <CardContent className="p-8 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-accent/[0.02]" />
            <div className="relative">
              <div className="text-center mb-8">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <Lock className="h-7 w-7 text-primary" />
                </div>
                <h1 className="font-sans text-2xl font-bold" data-testid="text-login-title">
                  Admin Dashboard
                </h1>
                <p className="text-muted-foreground font-mono text-sm mt-2" data-testid="text-login-subtitle">
                  Sign in to manage your properties and leads
                </p>
              </div>

              <Button
                className="w-full gap-2 transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
                onClick={() => { window.location.href = "/api/login"; }}
                data-testid="button-admin-login"
              >
                <LogIn className="h-4 w-4" />
                Sign In with Replit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AdminDashboard user={user} />;
}
