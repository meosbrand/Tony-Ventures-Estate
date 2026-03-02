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
import { Send, CheckCircle } from "lucide-react";
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
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-primary mb-4" />
          <h3 className="font-sans text-lg font-semibold mb-2" data-testid="text-lead-success-title">
            Thank You!
          </h3>
          <p className="text-muted-foreground font-mono" data-testid="text-lead-success-desc">
            We've received your inquiry and will get back to you soon.
          </p>
          <Button
            variant="ghost"
            className="mt-4"
            onClick={() => {
              setSubmitted(false);
              form.reset();
            }}
            data-testid="button-submit-another"
          >
            Submit Another Inquiry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} data-testid="input-lead-name" />
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
                    <Input type="email" placeholder="john@example.com" {...field} data-testid="input-lead-email" />
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
                    <Input placeholder="+234 800 000 0000" {...field} data-testid="input-lead-phone" />
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
                      className="resize-none"
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
              className="w-full gap-2"
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
      </CardContent>
    </Card>
  );
}
