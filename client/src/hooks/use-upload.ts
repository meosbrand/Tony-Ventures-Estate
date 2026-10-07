import { useState, useCallback, useRef } from "react";

interface UploadResponse {
  url: string;
  objectPath: string;
}

interface UseUploadOptions {
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

/** Uploads a listing photo through the API (`POST /api/uploads/upload`) with real progress. */
function postImage(file: File, onProgress: (percent: number) => void): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads/upload");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && data) {
        resolve({ url: data.url || data.objectPath, objectPath: data.objectPath || data.url });
      } else {
        reject(new Error(data?.error || "Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error while uploading"));
    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}

export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  // Keep the latest callbacks without re-creating uploadFile on every render.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const uploadFile = useCallback(async (file: File): Promise<UploadResponse | null> => {
    setIsUploading(true);
    setError(null);
    setProgress(0);

    try {
      const result = await postImage(file, setProgress);
      optionsRef.current.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Upload failed");
      setError(error);
      optionsRef.current.onError?.(error);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { uploadFile, isUploading, error, progress };
}
