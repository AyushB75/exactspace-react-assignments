import React, { StrictMode } from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";

const photo = (id, author = `Author ${id}`) => ({
  id,
  author,
  download_url: `https://example.com/${id}.jpg`,
});
const response = (data) => ({ ok: true, json: async () => data });
let intersect;
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback) {
        intersect = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe.each(["picsum", "mock"])("Photo gallery (%s)", (source) => {
  beforeEach(() => vi.stubEnv("VITE_PHOTO_SOURCE", source));
  it("shows a retry state when a request exceeds the timeout", async () => {
    vi.useFakeTimers();
    fetch.mockImplementation(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    render(<App />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading photos");
    await act(async () => vi.advanceTimersByTimeAsync(15000));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The request timed out",
    );
    expect(
      screen.getByRole("button", { name: "Retry loading photos" }),
    ).toBeEnabled();
  });
  it("handles an initially empty feed without requesting additional pages", async () => {
    fetch.mockResolvedValueOnce(response([]));
    render(<App />);
    await screen.findByText("No photos available.");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: "Load more photos" }),
    ).not.toBeInTheDocument();
  });
  it("loads, appends, deduplicates and stops only at an empty page; keeps independent likes", async () => {
    fetch
      .mockResolvedValueOnce(response([photo("1"), photo("2")]))
      .mockResolvedValueOnce(response([photo("2"), photo("3")]))
      .mockResolvedValueOnce(response([]));
    const user = userEvent.setup();
    render(<App />);
    const firstLike = await screen.findByRole("button", {
      name: "Like photo by Author 1",
    });
    await user.click(firstLike);
    await user.click(firstLike);
    expect(firstLike).toHaveTextContent("2");
    expect(
      screen.getByRole("button", { name: "Like photo by Author 2" }),
    ).toHaveTextContent("0");
    act(() => intersect([{ isIntersecting: true }]));
    await screen.findByAltText("Photograph by Author 3");
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(firstLike).toHaveTextContent("2");
    act(() => intersect([{ isIntersecting: true }]));
    await screen.findByText("You’ve reached the end of the gallery.");
    act(() => intersect([{ isIntersecting: true }]));
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls.map((call) => call[0])).toEqual(
      [1, 2, 3].map((page) =>
        source === "picsum"
          ? `https://picsum.photos/v2/list?page=${page}`
          : `/mock/page-${page}.json`,
      ),
    );
  });
  it("retries the failed page without losing existing photos", async () => {
    fetch
      .mockResolvedValueOnce(response([photo("1")]))
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce(response([photo("2")]));
    render(<App />);
    await screen.findByAltText("Photograph by Author 1");
    act(() => intersect([{ isIntersecting: true }]));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network unavailable",
    );
    expect(screen.getAllByRole("article")).toHaveLength(1);
    await userEvent.click(
      screen.getByRole("button", { name: "Retry loading photos" }),
    );
    await screen.findByAltText("Photograph by Author 2");
    expect(fetch.mock.calls[1][0]).toBe(fetch.mock.calls[2][0]);
  });
  it("prevents concurrent pagination requests", async () => {
    let resolve;
    fetch.mockResolvedValueOnce(response([photo("1")])).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    render(<App />);
    await screen.findByAltText("Photograph by Author 1");
    act(() => {
      intersect([{ isIntersecting: true }]);
      intersect([{ isIntersecting: true }]);
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    await act(async () => resolve(response([])));
  });
  it("recovers from StrictMode cancellation without appending stale responses", async () => {
    fetch.mockImplementation(
      (_url, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
          setTimeout(() => resolve(response([photo("1")])), 5);
        }),
    );
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await screen.findByAltText("Photograph by Author 1");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("handles malformed responses and failed images", async () => {
    fetch
      .mockResolvedValueOnce(response({ unexpected: true }))
      .mockResolvedValueOnce(response([photo("1")]));
    render(<App />);
    await screen.findByRole("alert");
    await userEvent.click(
      screen.getByRole("button", { name: "Retry loading photos" }),
    );
    const img = await screen.findByAltText("Photograph by Author 1");
    act(() => img.dispatchEvent(new Event("error")));
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Photo by Author 1 unavailable",
    );
    await userEvent.click(screen.getByRole("button", { name: "Retry image" }));
    await waitFor(() =>
      expect(screen.getByAltText("Photograph by Author 1")).toHaveAttribute(
        "src",
        "https://example.com/1.jpg",
      ),
    );
  });
});
