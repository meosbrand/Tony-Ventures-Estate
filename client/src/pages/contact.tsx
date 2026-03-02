import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { MapPin, Phone, Mail, Clock, Building2 } from "lucide-react";

export default function Contact() {
  return (
    <div className="min-h-screen">
      <section className="relative py-14 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="max-w-7xl mx-auto relative">
          <div className="animate-fade-in-up">
            <p className="text-primary font-mono text-sm font-medium mb-2 uppercase tracking-wider">Get In Touch</p>
            <h1 className="font-sans text-3xl md:text-4xl lg:text-5xl font-bold mb-3 tracking-tight" data-testid="text-contact-title">
              Contact Us
            </h1>
            <p className="text-muted-foreground font-mono mb-4 max-w-lg" data-testid="text-contact-subtitle">
              Have questions or ready to find your dream property? We'd love to hear from you.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="animate-slide-in-left">
              <h2 className="font-sans text-2xl font-bold mb-6" data-testid="text-lets-talk">
                Let's Talk Property
              </h2>
              <p className="text-muted-foreground font-mono mb-8 leading-relaxed max-w-md">
                Whether you're looking to buy, sell, or just need expert advice on the Nigerian real estate market, our team is here to help. Leave your details and we'll reach out within 24 hours.
              </p>
              <div className="space-y-5">
                {[
                  { icon: MapPin, title: "Office Location", desc: "Lagos, Nigeria" },
                  { icon: Phone, title: "Phone", desc: "Available on WhatsApp" },
                  { icon: Mail, title: "Email", desc: "info@tonymultiventures.com" },
                  { icon: Clock, title: "Business Hours", desc: "Mon - Sat, 9:00 AM - 6:00 PM" },
                ].map((item, i) => (
                  <div key={item.title} className={`flex items-start gap-4 animate-fade-in-up stagger-${i + 1}`}>
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-muted-foreground font-mono">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="animate-slide-in-right">
              <LeadCaptureForm />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-10 px-4 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <span className="font-sans font-semibold">Tony Multi Ventures</span>
            </div>
            <p className="text-sm text-muted-foreground font-mono" data-testid="text-copyright">
              &copy; {new Date().getFullYear()} Tony Multi Ventures
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
