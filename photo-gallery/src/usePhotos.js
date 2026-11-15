import { useCallback, useEffect, useRef, useState } from "react";
import { photoPageUrl } from "./photoSource";

export function usePhotos() {
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const page = useRef(1);
  const active = useRef(null);
  const finished = useRef(false);

  const loadMore = useCallback(async () => {
    if (active.current || finished.current) return;
    const controller = new AbortController();
    active.current = controller;
    setStatus("loading");
    setError("");
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(photoPageUrl(page.current), {
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error("Unable to load photos. Please try again.");
      const data = await response.json();
      if (
        !Array.isArray(data) ||
        data.some(
          (item) =>
            !item ||
            typeof item.id !== "string" ||
            typeof item.author !== "string" ||
            typeof item.download_url !== "string",
        )
      ) {
        throw new Error(
          "The photo service returned unexpected data. Please retry.",
        );
      }
      if (active.current !== controller) return;
      if (data.length === 0) finished.current = true;
      setPhotos((previous) => {
        const seen = new Set(previous.map((photo) => photo.id));
        return [
          ...previous,
          ...data.filter((photo) => !seen.has(photo.id) && seen.add(photo.id)),
        ];
      });
      page.current += 1;
      setStatus(finished.current ? "finished" : "idle");
    } catch (cause) {
      if (active.current !== controller) return;
      setError(
        cause.name === "AbortError"
          ? "The request timed out. Please retry."
          : cause.message || "Unable to load photos.",
      );
      setStatus("error");
    } finally {
      clearTimeout(timeout);
      if (active.current === controller) active.current = null;
    }
  }, []);

  useEffect(() => {
    loadMore();
    return () => {
      const request = active.current;
      active.current = null;
      request?.abort();
    };
  }, [loadMore]);
  return { photos, status, error, loadMore };
}
