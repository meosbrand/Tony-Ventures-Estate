import { useState, useCallback } from "react";

interface UploadResponse {
  url: string;
  objectPath: string;
}

interface UseUploadOptions {
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        setProgress(10);

        const supabaseRes = await fetch("/api/uploads/upload", {
          method: "POST",
          body: (() => {
            const fd = new FormData();
            fd.append("file", file);
            return fd;
          })(),
        });

        if (supabaseRes.ok) {
          setProgress(100);
          const data = await supabaseRes.json();
          const result = { url: data.url || data.objectPath, objectPath: data.objectPath || data.url };
          options.onSuccess?.(result);
          return result;
        }

        if (supabaseRes.status !== 404) {
          const errData = await supabaseRes.json().catch(() => ({}));
          throw new Error(errData.error || "Upload failed");
        }

        const urlRes = await fetch("/api/uploads/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            contentType: file.type || "application/octet-stream",
          }),
        });

        if (!urlRes.ok) {
          const errData = await urlRes.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to get upload URL");
        }

        const { uploadURL, objectPath } = await urlRes.json();
        setProgress(30);

        const putRes = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });

        if (!putRes.ok) throw new Error("Failed to upload file to storage");

        setProgress(100);
        const result = { url: objectPath, objectPath };
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed");
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [options]
  );

  return { uploadFile, isUploading, error, progress };
}
