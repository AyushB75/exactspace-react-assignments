import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbsUp } from "@fortawesome/free-solid-svg-icons";
import { usePhotos } from "./usePhotos";

function PhotoCard({ photo }) {
  const [likes, setLikes] = useState(0);
  const [failed, setFailed] = useState(false);
  return (
    <article className="photo-row">
      {failed ? (
        <div
          className="image-fallback"
          role="img"
          aria-label={`Photo by ${photo.author} unavailable`}
        >
          Photo unavailable
          <button onClick={() => setFailed(false)}>Retry image</button>
        </div>
      ) : (
        <img
          src={photo.download_url}
          width={photo.width}
          height={photo.height}
          alt={`Photograph by ${photo.author}`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
      <div className="photo-details">
        <span>Author: {photo.author}</span>
        <button
          className="like"
          aria-label={`Like photo by ${photo.author}`}
          onClick={() => setLikes((count) => count + 1)}
        >
          <FontAwesomeIcon icon={faThumbsUp} />
          <span aria-live="polite">{likes}</span>
        </button>
      </div>
    </article>
  );
}

export default function App() {
  const { photos, status, error, loadMore } = usePhotos();
  const sentinel = useRef(null);
  useEffect(() => {
    if (status !== "idle" || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: "300px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [status, loadMore]);
  return (
    <main>
      <h1>Photo gallery</h1>
      <section aria-label="Photo gallery">
        {photos.map((photo) => (
          <PhotoCard key={photo.id} photo={photo} />
        ))}
      </section>
      <div ref={sentinel} className="feed-status" aria-live="polite">
        {status === "loading" && <p role="status">Loading photos…</p>}
        {status === "error" && (
          <>
            <p role="alert">{error}</p>
            <button onClick={loadMore}>Retry loading photos</button>
          </>
        )}
        {status === "finished" && (
          <p>
            {photos.length
              ? "You’ve reached the end of the gallery."
              : "No photos available."}
          </p>
        )}
        {status === "idle" && (
          <button onClick={loadMore}>Load more photos</button>
        )}
      </div>
    </main>
  );
}
