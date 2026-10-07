import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUpload } from "@/hooks/use-upload";
import { PropertyMediaManager } from "@/components/admin/PropertyMediaManager";
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  Users,
  LogOut,
  MapPin,
  Upload,
  Image,
  TrendingUp,
  UserPlus,
  Film,
  Box,
  LayoutPanelTop,
  FileText,
  HardDrive,
} from "lucide-react";
import type { Lead, PropertyWithMediaFlags } from "@shared/schema";

type Property = PropertyWithMediaFlags;

const propertyFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  location: z.string().min(2, "Location is required"),
  price: z.string().min(1, "Price is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  shortDescription: z.string().min(10, "Short description is required"),
  propertyType: z.string().min(1, "Property type is required"),
  bedrooms: z.coerce.number().min(0).optional(),
  bathrooms: z.coerce.number().min(0).optional(),
  area: z.coerce.number().min(0).optional(),
  imageUrl: z.string().optional(),
  featured: z.boolean().default(false),
  status: z.string().default("available"),
});

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

interface AdminDashboardProps {
  user: { id: string; username: string };
  onLogout: () => void;
}

function PropertyForm({
  property,
  onSaved,
  onClose,
}: {
  property?: Property;
  onSaved: (saved: Property, created: boolean) => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string>(property?.imageUrl || "");
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      const path = response.objectPath;
      setImagePreview(path);
      form.setValue("imageUrl", path);
    },
    onError: (error) => {
      toast({ title: "Image upload failed", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      name: property?.name || "",
      location: property?.location || "",
      price: property?.price?.toString() || "",
      description: property?.description || "",
      shortDescription: property?.shortDescription || "",
      propertyType: property?.propertyType || "",
      bedrooms: property?.bedrooms || undefined,
      bathrooms: property?.bathrooms || undefined,
      area: property?.area || undefined,
      imageUrl: property?.imageUrl || "",
      featured: property?.featured || false,
      status: property?.status || "available",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: PropertyFormValues) => {
      if (property) {
        const res = await apiRequest("PATCH", `/api/properties/${property.id}`, data);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/properties", data);
        return res.json();
      }
    },
    onSuccess: (saved: Property) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties/featured"] });
      toast({
        title: property ? "Property Updated" : "Property Created",
        description: property
          ? "The property has been updated successfully."
          : "Now add videos, 3D models or floor plans in the other tabs.",
      });
      onSaved(saved, !property);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to save property.", variant: "destructive" });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Property Name</FormLabel>
                <FormControl>
                  <Input placeholder="Sunset Villa Estate" {...field} data-testid="input-property-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Lekki Phase 1, Lagos" {...field} data-testid="input-property-location" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (₦)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="450000" {...field} data-testid="input-property-price" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="propertyType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Property Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-property-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Villa">Villa</SelectItem>
                    <SelectItem value="Apartment">Apartment</SelectItem>
                    <SelectItem value="Mansion">Mansion</SelectItem>
                    <SelectItem value="Penthouse">Penthouse</SelectItem>
                    <SelectItem value="Terrace">Terrace</SelectItem>
                    <SelectItem value="Duplex">Duplex</SelectItem>
                    <SelectItem value="Bungalow">Bungalow</SelectItem>
                    <SelectItem value="Land">Land</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-property-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="bedrooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bedrooms</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} data-testid="input-property-beds" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bathrooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bathrooms</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} data-testid="input-property-baths" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="area"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Area (sqft)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} data-testid="input-property-area" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="shortDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Short Description</FormLabel>
              <FormControl>
                <Input placeholder="Brief summary for property cards..." {...field} data-testid="input-property-short-desc" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detailed property description..."
                  className="resize-none"
                  rows={5}
                  {...field}
                  data-testid="input-property-desc"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <Label className="mb-2 block">Property Image</Label>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={handleImageUpload}
                data-testid="input-property-image"
              />
              <Button type="button" variant="secondary" size="sm" className="gap-2" asChild>
                <span>
                  <Upload className="h-4 w-4" />
                  {isUploading ? `Uploading ${progress}%` : "Upload Image"}
                </span>
              </Button>
            </label>
            {imagePreview && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Image className="h-4 w-4" />
                <span className="truncate max-w-[200px]">{imagePreview}</span>
              </div>
            )}
          </div>
        </div>

        <FormField
          control={form.control}
          name="featured"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-property-featured"
                />
              </FormControl>
              <FormLabel className="!mt-0">Featured Property</FormLabel>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} data-testid="button-cancel-property">
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending} className="transition-transform duration-200 active:scale-[0.98]" data-testid="button-save-property">
            {mutation.isPending ? "Saving..." : property ? "Update Property" : "Create Property"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/** Property dialog: details first; media tabs unlock once the property exists. */
function PropertyEditor({ property, onClose }: { property?: Property; onClose: () => void }) {
  const [current, setCurrent] = useState<Property | undefined>(property);
  const [tab, setTab] = useState("details");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-4 bg-muted/40 p-1 flex-wrap h-auto" data-testid="tabs-property-editor">
        <TabsTrigger value="details" className="gap-2"><FileText className="h-4 w-4" />Details</TabsTrigger>
        <TabsTrigger value="video" className="gap-2" disabled={!current} data-testid="tab-media-video">
          <Film className="h-4 w-4" />Video
        </TabsTrigger>
        <TabsTrigger value="3d" className="gap-2" disabled={!current} data-testid="tab-media-3d">
          <Box className="h-4 w-4" />3D &amp; Tour
        </TabsTrigger>
        <TabsTrigger value="floorplans" className="gap-2" disabled={!current} data-testid="tab-media-floorplans">
          <LayoutPanelTop className="h-4 w-4" />Floor plans
        </TabsTrigger>
      </TabsList>
      {!current && (
        <p className="text-xs text-muted-foreground mb-3">Save the property first to add video, 3D and floor plans.</p>
      )}
      <TabsContent value="details">
        <PropertyForm
          property={current}
          onClose={onClose}
          onSaved={(saved, created) => {
            if (created) {
              setCurrent(saved);
              setTab("video");
            } else {
              onClose();
            }
          }}
        />
      </TabsContent>
      {current && (
        <>
          <TabsContent value="video"><PropertyMediaManager propertyId={current.id} section="video" /></TabsContent>
          <TabsContent value="3d"><PropertyMediaManager propertyId={current.id} section="3d" /></TabsContent>
          <TabsContent value="floorplans"><PropertyMediaManager propertyId={current.id} section="floorplans" /></TabsContent>
        </>
      )}
    </Tabs>
  );
}

function StorageMeter() {
  const { data } = useQuery<{ usedBytes: number; budgetBytes: number }>({
    queryKey: ["/api/admin/media/usage"],
  });
  if (!data) return null;
  const pct = Math.min(100, Math.round((data.usedBytes / data.budgetBytes) * 100));
  return (
    <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground font-mono" data-testid="text-storage-usage">
      <HardDrive className="h-4 w-4" />
      <span className={pct >= 90 ? "text-destructive" : undefined}>
        Media {(data.usedBytes / 1024 / 1024).toFixed(0)} / {(data.budgetBytes / 1024 / 1024).toFixed(0)} MB
      </span>
    </div>
  );
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [editProperty, setEditProperty] = useState<Property | undefined>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  const { data: properties, isLoading: propsLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const deleteProperty = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/properties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties/featured"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media/usage"] });
      toast({ title: "Property Deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete property.", variant: "destructive" });
    },
  });

  const updateLeadStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/leads/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead Updated" });
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead Deleted" });
    },
  });

  return (
    <div className="min-h-screen">
      <div className="border-b glass sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-sans text-xl font-bold" data-testid="text-admin-title">
              Admin Dashboard
            </h1>
            <p className="text-sm text-muted-foreground font-mono" data-testid="text-admin-user">
              Welcome, {user.username}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <StorageMeter />
            <Button variant="ghost" onClick={onLogout} className="gap-2" data-testid="button-logout">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {[
            {
              icon: Building2,
              value: properties?.length || 0,
              label: "Total Properties",
              testId: "card-stat-total-props",
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              icon: Users,
              value: leads?.length || 0,
              label: "Total Leads",
              testId: "card-stat-total-leads",
              color: "text-chart-2",
              bg: "bg-chart-2/10",
            },
            {
              icon: UserPlus,
              value: leads?.filter((l) => l.status === "new").length || 0,
              label: "New Leads",
              testId: "card-stat-new-leads",
              color: "text-chart-3",
              bg: "bg-chart-3/10",
            },
          ].map((stat, i) => (
            <Card key={stat.testId} className={`border-0 smooth-shadow animate-fade-in-up stagger-${i + 1}`} data-testid={stat.testId}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="font-sans text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground font-mono">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="properties">
          <TabsList className="mb-6 bg-muted/40 p-1" data-testid="tabs-admin">
            <TabsTrigger value="properties" className="gap-2" data-testid="tab-properties">
              <Building2 className="h-4 w-4" />
              Properties
            </TabsTrigger>
            <TabsTrigger value="leads" className="gap-2" data-testid="tab-leads">
              <Users className="h-4 w-4" />
              Leads
            </TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="animate-fade-in">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="font-sans text-lg font-semibold" data-testid="text-manage-properties">
                Manage Properties
              </h2>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2 transition-transform duration-200 active:scale-[0.98]" data-testid="button-add-property">
                    <Plus className="h-4 w-4" />
                    Add Property
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Add New Property</DialogTitle>
                  </DialogHeader>
                  <PropertyEditor onClose={() => setShowCreateDialog(false)} />
                </DialogContent>
              </Dialog>
            </div>

            <Dialog open={!!editProperty} onOpenChange={(open) => !open && setEditProperty(undefined)}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Edit Property</DialogTitle>
                </DialogHeader>
                {editProperty && (
                  <PropertyEditor
                    key={editProperty.id}
                    property={editProperty}
                    onClose={() => setEditProperty(undefined)}
                  />
                )}
              </DialogContent>
            </Dialog>

            {propsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : properties && properties.length > 0 ? (
              <div className="space-y-3">
                {properties.map((property, i) => (
                  <Card key={property.id} className={`border-0 smooth-shadow animate-fade-in-up stagger-${Math.min(i + 1, 5)}`} data-testid={`admin-property-${property.id}`}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-16 w-20 rounded-xl bg-muted shrink-0 overflow-hidden img-zoom">
                        {property.imageUrl ? (
                          <img
                            src={property.imageUrl}
                            alt={property.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-sans font-semibold truncate">{property.name}</h3>
                          <Badge variant="secondary">{property.propertyType}</Badge>
                          {property.featured && <Badge>Featured</Badge>}
                          {property.hasVideo && <Badge variant="outline" className="gap-1"><Film className="h-3 w-3" />Video</Badge>}
                          {property.has3d && <Badge variant="outline" className="gap-1"><Box className="h-3 w-3" />3D</Badge>}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 text-primary/50" />
                          <span className="font-mono truncate">{property.location}</span>
                          <span className="font-mono ml-2 font-semibold text-foreground">
                            ₦{Number(property.price).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="rounded-full"
                          onClick={() => setEditProperty(property)}
                          data-testid={`button-edit-${property.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="rounded-full text-destructive/70 hover:text-destructive"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this property?")) {
                              deleteProperty.mutate(property.id);
                            }
                          }}
                          data-testid={`button-delete-${property.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 smooth-shadow">
                <CardContent className="py-16 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-mono">No properties yet. Add your first one!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="leads" className="animate-fade-in">
            <h2 className="font-sans text-lg font-semibold mb-6" data-testid="text-manage-leads">
              Manage Leads
            </h2>

            {leadsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : leads && leads.length > 0 ? (
              <div className="space-y-3">
                {leads.map((lead, i) => (
                  <Card key={lead.id} className={`border-0 smooth-shadow animate-fade-in-up stagger-${Math.min(i + 1, 5)}`} data-testid={`admin-lead-${lead.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-sans font-semibold">{lead.name}</h3>
                            <Badge
                              variant={
                                lead.status === "new"
                                  ? "default"
                                  : lead.status === "contacted"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {lead.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground font-mono mt-1">
                            {lead.email} {lead.phone && `| ${lead.phone}`}
                          </p>
                          {lead.message && (
                            <p className="text-sm mt-2 text-muted-foreground line-clamp-2 bg-muted/30 rounded-lg px-3 py-2">
                              {lead.message}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2 font-mono">
                            {new Date(lead.createdAt).toLocaleDateString()} | Source: {lead.source}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Select
                            defaultValue={lead.status}
                            onValueChange={(status) =>
                              updateLeadStatus.mutate({ id: lead.id, status })
                            }
                          >
                            <SelectTrigger className="w-[130px]" data-testid={`select-lead-status-${lead.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="contacted">Contacted</SelectItem>
                              <SelectItem value="qualified">Qualified</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-full text-destructive/70 hover:text-destructive"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this lead?")) {
                                deleteLead.mutate(lead.id);
                              }
                            }}
                            data-testid={`button-delete-lead-${lead.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 smooth-shadow">
                <CardContent className="py-16 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-mono">No leads yet. They'll appear here when visitors inquire.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
