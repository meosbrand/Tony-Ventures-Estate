import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { adminJson, uploadPropertyMedia, UploadCancelledError } from "@/lib/media-upload";
import { inspectGlb } from "@/lib/glb-inspect";
import { ModelViewer } from "@/components/media/ModelViewer";
import { formatDuration } from "@/components/media/PropertyVideo";
import { UPLOAD_KIND_SPECS, MAX_VIDEO_SECONDS, MB } from "@shared/media-limits";
import type { AdminPropertyMedia } from "@shared/schema";
import { Upload, Trash2, Film, Box, Link2, X, LayoutPanelTop, Eye, EyeOff } from "lucide-react";

export type MediaSection = "video" | "3d" | "floorplans";

interface UploadJob {
  id: number;
  label: string;
  stage: "compressing" | "uploading" | "verifying" | "error";
  percent: number;
  error?: string;
  controller: AbortController;
}

const STAGE_LABEL: Record<UploadJob["stage"], string> = {
  compressing: "Compressing",
  uploading: "Uploading",
  verifying: "Verifying",
  error: "Failed",
};

const isCancel = (err: unknown, signal: AbortSignal) =>
  signal.aborted || err instanceof UploadCancelledError || (err as Error)?.name === "AbortError";

const formatSize = (bytes: number | null) => (bytes == null ? "" : `${(bytes / MB).toFixed(1)} MB`);

function useUploadJobs() {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const nextId = useRef(1);

  const start = (label: string) => {
    const job: UploadJob = { id: nextId.current++, label, stage: "uploading", percent: 0, controller: new AbortController() };
    setJobs((js) => [...js, job]);
    const patch = (p: Partial<UploadJob>) => setJobs((js) => js.map((j) => (j.id === job.id ? { ...j, ...p } : j)));
    return {
      signal: job.controller.signal,
      update: (stage: UploadJob["stage"], percent: number) => patch({ stage, percent }),
      fail: (error: string) => patch({ stage: "error", error }),
      remove: () => setJobs((js) => js.filter((j) => j.id !== job.id)),
    };
  };
  const dismiss = (id: number) => setJobs((js) => js.filter((j) => j.id !== id));
  return { jobs, start, dismiss };
}

function JobList({ jobs, onDismiss }: { jobs: UploadJob[]; onDismiss: (id: number) => void }) {
  if (jobs.length === 0) return null;
  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <div key={job.id} className="rounded-xl border p-3 space-y-2" data-testid="upload-job">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate font-mono">{job.label}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className={job.stage === "error" ? "text-destructive" : "text-muted-foreground"}>
                {STAGE_LABEL[job.stage]}
                {job.stage !== "error" && job.stage !== "verifying" ? ` ${Math.round(job.percent)}%` : ""}
              </span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label={job.stage === "error" ? "Dismiss" : "Cancel upload"}
                onClick={() => (job.stage === "error" ? onDismiss(job.id) : job.controller.abort())}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {job.stage === "error" ? (
            <p className="text-sm text-destructive" data-testid="upload-error">{job.error}</p>
          ) : (
            <Progress value={job.stage === "verifying" ? 100 : job.percent} className="h-2" />
          )}
        </div>
      ))}
    </div>
  );
}

function FilePickButton({
  accept,
  label,
  disabled,
  multiple,
  onFiles,
  testId,
}: {
  accept: string;
  label: string;
  disabled?: boolean;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  testId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        data-testid={testId}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
      <Button type="button" variant="secondary" size="sm" className="gap-2" disabled={disabled} onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4" />
        {label}
      </Button>
    </>
  );
}

function DeleteMediaButton({ media, onDeleted }: { media: AdminPropertyMedia; onDeleted: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="rounded-full text-destructive/70 hover:text-destructive shrink-0"
      disabled={busy}
      aria-label="Delete"
      data-testid={`button-delete-media-${media.id}`}
      onClick={async () => {
        if (!confirm("Delete this file? This can't be undone.")) return;
        setBusy(true);
        try {
          await adminJson("DELETE", `/api/admin/media/${media.id}`);
          onDeleted();
        } catch (err) {
          toast({ title: "Delete failed", description: (err as Error).message, variant: "destructive" });
        } finally {
          setBusy(false);
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

export function PropertyMediaManager({ propertyId, section }: { propertyId: number; section: MediaSection }) {
  const { toast } = useToast();
  const { jobs, start, dismiss } = useUploadJobs();
  const mediaKey = ["/api/admin/properties", propertyId, "media"];
  const { data: media = [], isLoading } = useQuery<AdminPropertyMedia[]>({ queryKey: mediaKey });
  const { data: usage } = useQuery<{ tourHosts: string[]; storageConfigured: boolean }>({
    queryKey: ["/api/admin/media/usage"],
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: mediaKey });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/media/usage"] });
    queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
  };

  const videos = media.filter((m) => m.kind === "video");
  const models = media.filter((m) => m.kind === "model3d");
  const floorplans = media.filter((m) => m.kind === "floorplan");
  const tour = media.find((m) => m.kind === "tour");
  const activeJobs = jobs.filter((j) => j.stage !== "error").length;

  async function handleVideo(file: File) {
    const job = start(file.name);
    let posterId: string | undefined;
    try {
      job.update("compressing", 0);
      const { compressVideo } = await import("@/lib/video-compress");
      const result = await compressVideo(file, (p) => job.update("compressing", p), job.signal);

      if (result.poster) {
        const poster = await uploadPropertyMedia({
          propertyId,
          kind: "poster",
          file: result.poster,
          contentType: "image/jpeg",
          signal: job.signal,
        });
        posterId = poster.id;
      }
      await uploadPropertyMedia({
        propertyId,
        kind: "video",
        file: result.video,
        contentType: "video/mp4",
        durationSec: result.durationSec,
        width: result.width,
        height: result.height,
        posterId,
        onProgress: (p) => job.update("uploading", p),
        onVerifying: () => job.update("verifying", 100),
        signal: job.signal,
      });
      job.remove();
      toast({
        title: "Video added",
        description: result.reencoded
          ? `Compressed ${formatSize(file.size)} → ${formatSize(result.video.size)}${result.audioDropped ? " (this browser couldn't encode the audio, so it was removed)" : ""}.`
          : "Uploaded without re-encoding because this browser can't compress video.",
      });
    } catch (err) {
      if (posterId) adminJson("DELETE", `/api/admin/media/${posterId}`).catch(() => {});
      if (isCancel(err, job.signal)) job.remove();
      else job.fail((err as Error).message || "Upload failed");
    } finally {
      refresh();
    }
  }

  async function handleModel(file: File) {
    const job = start(file.name);
    try {
      if (file.size > UPLOAD_KIND_SPECS.model3d.maxBytes) {
        throw new Error(`Model is ${formatSize(file.size)}; the limit is ${UPLOAD_KIND_SPECS.model3d.maxBytes / MB} MB.`);
      }
      await inspectGlb(file);
      await uploadPropertyMedia({
        propertyId,
        kind: "model3d",
        file,
        contentType: "model/gltf-binary",
        onProgress: (p) => job.update("uploading", p),
        onVerifying: () => job.update("verifying", 100),
        signal: job.signal,
      });
      job.remove();
      toast({ title: "3D model added" });
    } catch (err) {
      if (isCancel(err, job.signal)) job.remove();
      else job.fail((err as Error).message || "Upload failed");
    } finally {
      refresh();
    }
  }

  async function handleFloorplan(file: File) {
    const job = start(file.name);
    try {
      const spec = UPLOAD_KIND_SPECS.floorplan;
      if (!spec.mimes[file.type]) throw new Error("Floor plans must be JPEG, PNG or WebP images.");
      if (file.size > spec.maxBytes) throw new Error(`Image is ${formatSize(file.size)}; the limit is ${spec.maxBytes / MB} MB.`);
      await uploadPropertyMedia({
        propertyId,
        kind: "floorplan",
        file,
        contentType: file.type,
        onProgress: (p) => job.update("uploading", p),
        onVerifying: () => job.update("verifying", 100),
        signal: job.signal,
      });
      job.remove();
    } catch (err) {
      if (isCancel(err, job.signal)) job.remove();
      else job.fail((err as Error).message || "Upload failed");
    } finally {
      refresh();
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground font-mono py-6">Loading media…</p>;

  const storageWarning = usage && !usage.storageConfigured && (
    <p className="text-sm text-destructive">
      File storage isn't configured on the server (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY), so uploads are disabled.
    </p>
  );

  return (
    <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
      {storageWarning}

      {section === "video" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Walkthrough videos up to {MAX_VIDEO_SECONDS / 60} min. They're compressed to 720p MP4 in your browser
              before uploading (works best in Chrome or Edge). Max {UPLOAD_KIND_SPECS.video.maxPerProperty} per property.
            </p>
            <FilePickButton
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mov,.mp4,.m4v,.webm,.mkv"
              label="Upload video"
              disabled={videos.length + activeJobs >= UPLOAD_KIND_SPECS.video.maxPerProperty || usage?.storageConfigured === false}
              onFiles={(files) => files.forEach(handleVideo)}
              testId="input-property-video"
            />
          </div>
          <JobList jobs={jobs} onDismiss={dismiss} />
          {videos.length === 0 && jobs.length === 0 && (
            <EmptyState icon={Film} text="No videos yet." />
          )}
          <div className="space-y-3">
            {videos.map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-xl border p-3" data-testid="admin-video-item">
                <div className="h-16 w-28 rounded-lg bg-muted overflow-hidden shrink-0">
                  {v.posterUrl ? (
                    <img src={v.posterUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center"><Film className="h-5 w-5 text-muted-foreground" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatDuration(v.durationSec)}</span>
                    {v.status !== "ready" && <Badge variant="outline">Incomplete</Badge>}
                  </div>
                  <p className="text-muted-foreground font-mono">
                    {v.width && v.height ? `${v.width}×${v.height} · ` : ""}{formatSize(v.sizeBytes)}
                  </p>
                  {v.status === "ready" && (
                    <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
                      Preview
                    </a>
                  )}
                </div>
                <DeleteMediaButton media={v} onDeleted={refresh} />
              </div>
            ))}
          </div>
        </>
      )}

      {section === "3d" && (
        <>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                3D model as a single <span className="font-mono">.glb</span> file (glTF Binary), up to{" "}
                {UPLOAD_KIND_SPECS.model3d.maxBytes / MB} MB; under 15 MB loads fastest on phones. Draco compression is supported.
              </p>
              <FilePickButton
                accept=".glb,model/gltf-binary"
                label="Upload .glb"
                disabled={models.length + activeJobs >= UPLOAD_KIND_SPECS.model3d.maxPerProperty || usage?.storageConfigured === false}
                onFiles={(files) => files.forEach(handleModel)}
                testId="input-property-model"
              />
            </div>
            <JobList jobs={jobs} onDismiss={dismiss} />
            {models.length === 0 && jobs.length === 0 && <EmptyState icon={Box} text="No 3D models yet." />}
            {models.map((m) => (
              <ModelRow key={m.id} media={m} onDeleted={refresh} />
            ))}
          </div>

          <div className="border-t border-dashed pt-5">
            <TourForm propertyId={propertyId} tour={tour} hosts={usage?.tourHosts ?? []} onChanged={refresh} />
          </div>
        </>
      )}

      {section === "floorplans" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              2D floor plan images (JPEG, PNG or WebP, up to {UPLOAD_KIND_SPECS.floorplan.maxBytes / MB} MB each).
            </p>
            <FilePickButton
              accept="image/jpeg,image/png,image/webp"
              label="Upload floor plans"
              multiple
              disabled={floorplans.length + activeJobs >= UPLOAD_KIND_SPECS.floorplan.maxPerProperty || usage?.storageConfigured === false}
              onFiles={(files) => files.forEach(handleFloorplan)}
              testId="input-property-floorplan"
            />
          </div>
          <JobList jobs={jobs} onDismiss={dismiss} />
          {floorplans.length === 0 && jobs.length === 0 && <EmptyState icon={LayoutPanelTop} text="No floor plans yet." />}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {floorplans.map((f) => (
              <div key={f.id} className="relative rounded-xl border overflow-hidden" data-testid="admin-floorplan-item">
                <img src={f.url} alt="Floor plan" className="aspect-[4/3] w-full object-contain bg-white" />
                <div className="absolute top-1 right-1 bg-background/80 rounded-full">
                  <DeleteMediaButton media={f} onDeleted={refresh} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

}

function ModelRow({ media: m, onDeleted }: { media: AdminPropertyMedia; onDeleted: () => void }) {
  const [preview, setPreview] = useState(false);
  return (
    <div className="rounded-xl border p-3 space-y-3" data-testid="admin-model-item">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Box className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0 text-sm">
          <p className="font-medium">3D model {m.status !== "ready" && <Badge variant="outline">Incomplete</Badge>}</p>
          <p className="text-muted-foreground font-mono">{formatSize(m.sizeBytes)}</p>
        </div>
        {m.status === "ready" && (
          <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => setPreview((p) => !p)}>
            {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {preview ? "Hide" : "Preview"}
          </Button>
        )}
        <DeleteMediaButton media={m} onDeleted={onDeleted} />
      </div>
      {preview && <ModelViewer src={m.url} alt="3D model preview" className="h-72 rounded-lg overflow-hidden" />}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Film; text: string }) {
  return (
    <div className="rounded-xl border border-dashed py-8 flex flex-col items-center gap-2 text-muted-foreground">
      <Icon className="h-6 w-6" />
      <p className="text-sm font-mono">{text}</p>
    </div>
  );
}

function TourForm({
  propertyId,
  tour,
  hosts,
  onChanged,
}: {
  propertyId: number;
  tour?: AdminPropertyMedia;
  hosts: string[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await adminJson("PUT", `/api/admin/properties/${propertyId}/tour`, { url });
      setUrl("");
      onChanged();
      toast({ title: "Virtual tour saved" });
    } catch (err) {
      toast({ title: "Couldn't save tour", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Remove the virtual tour link?")) return;
    setBusy(true);
    try {
      await adminJson("DELETE", `/api/admin/properties/${propertyId}/tour`);
      onChanged();
    } catch (err) {
      toast({ title: "Couldn't remove tour", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-medium flex items-center gap-2"><Link2 className="h-4 w-4" /> Virtual tour link</h4>
        <p className="text-sm text-muted-foreground">
          Paste the share link of a 3D tour{hosts.length ? ` from ${hosts.join(" or ")}` : ""}.
        </p>
      </div>
      {tour && (
        <div className="flex items-center gap-2 rounded-xl border p-3 text-sm" data-testid="admin-tour-item">
          <a href={tour.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate font-mono text-primary hover:underline">
            {tour.url}
          </a>
          <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={busy}>Remove</Button>
        </div>
      )}
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="https://my.matterport.com/show/?m=…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          data-testid="input-tour-url"
        />
        <Button type="button" onClick={save} disabled={busy || !url.trim()} data-testid="button-save-tour">
          {tour ? "Replace" : "Save"}
        </Button>
      </div>
    </div>
  );
}
