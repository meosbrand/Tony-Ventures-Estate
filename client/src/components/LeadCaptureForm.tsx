import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Send, CheckCircle, ArrowRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

const leadFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  message: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

interface LeadCaptureFormProps {
  propertyId?: number;
  propertyName?: string;
}

export function LeadCaptureForm({ propertyId, propertyName }: LeadCaptureFormProps) {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: propertyName ? `I'm interested in ${propertyName}` : "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: LeadFormValues) => {
      const res = await apiRequest("POST", "/api/leads", {
        ...data,
        propertyId: propertyId || null,
        source: propertyId ? "property_page" : "website",
      });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Thank you!",
        description: "We've received your inquiry and will contact you shortly.",
      });
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  if (submitted) {
    return (
      <Card className="border-0 smooth-shadow overflow-hidden">
        <CardContent className="py-14 text-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 animate-scale-in">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-sans text-xl font-semibold mb-2 animate-fade-in-up" data-testid="text-lead-success-title">
              Thank You!
            </h3>
            <p className="text-muted-foreground font-mono animate-fade-in-up stagger-1" data-testid="text-lead-success-desc">
              We've received your inquiry and will get back to you soon.
            </p>
            <Button
              variant="ghost"
              className="mt-5 gap-2 animate-fade-in-up stagger-2"
              onClick={() => {
                setSubmitted(false);
                form.reset();
              }}
              data-testid="button-submit-another"
            >
              Submit Another Inquiry
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 smooth-shadow overflow-hidden">
      <CardContent className="p-6 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-accent/[0.02]" />
        <div className="relative">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" className="bg-background/60" {...field} data-testid="input-lead-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" className="bg-background/60" {...field} data-testid="input-lead-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="+234 800 000 0000" className="bg-background/60" {...field} data-testid="input-lead-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us what you're looking for..."
                        className="resize-none bg-background/60"
                        rows={3}
                        {...field}
                        data-testid="input-lead-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full gap-2 transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
                disabled={mutation.isPending}
                data-testid="button-submit-lead"
              >
                {mutation.isPending ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Inquiry
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}
