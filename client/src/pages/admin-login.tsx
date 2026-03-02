import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Building2, LogIn } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

interface AdminLoginProps {
  onLogin: (user: { id: string; username: string }) => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof loginSchema>) => {
      const res = await apiRequest("POST", "/api/admin/login", data);
      return res.json();
    },
    onSuccess: (user) => {
      onLogin(user);
      toast({ title: "Welcome back!", description: `Logged in as ${user.username}` });
    },
    onError: () => {
      toast({
        title: "Login Failed",
        description: "Invalid username or password.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="h-14 w-14 rounded-md bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-sans text-2xl font-bold" data-testid="text-login-title">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-1" data-testid="text-login-subtitle">
              Sign in to manage your properties
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="admin" {...field} data-testid="input-admin-username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter password" {...field} data-testid="input-admin-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={mutation.isPending}
                data-testid="button-admin-login"
              >
                {mutation.isPending ? "Signing in..." : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
