import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Composer from "./Composer.jsx";
import { mergeMessage } from "./useChat";

describe("Chat composer", () => {
  it("selects emoji with Enter without accidentally submitting and closes with Escape", async () => {
    const publish = vi.fn();
    render(<Composer connected publish={publish} />);
    await userEvent.type(
      screen.getByRole("textbox", { name: "Message" }),
      "Hello ",
    );
    await userEvent.click(screen.getByRole("button", { name: "Choose emoji" }));
    await userEvent.type(
      screen.getByRole("textbox", { name: "Search emojis" }),
      "wave{Enter}",
    );
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(
      "Hello 👋",
    );
    expect(publish).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Choose emoji" }));
    await userEvent.keyboard("{Escape}");
    expect(
      screen.queryByRole("region", { name: "Emoji picker" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveFocus();
  });
  it("rejects blank messages and disables sending offline", async () => {
    const publish = vi.fn();
    const { rerender } = render(<Composer connected publish={publish} />);
    expect(screen.getByRole("button", { name: /Send/ })).toBeDisabled();
    await userEvent.type(
      screen.getByRole("textbox", { name: "Message" }),
      "   ",
    );
    expect(screen.getByRole("button", { name: /Send/ })).toBeDisabled();
    await userEvent.type(
      screen.getByRole("textbox", { name: "Message" }),
      "hello",
    );
    rerender(<Composer connected={false} publish={publish} />);
    expect(screen.getByRole("button", { name: /Send/ })).toBeDisabled();
    expect(publish).not.toHaveBeenCalled();
  });
  it("searches and inserts emojis, selects a mention, and sends the composed message", async () => {
    const user = userEvent.setup();
    const publish = vi.fn().mockResolvedValue({});
    render(<Composer connected publish={publish} />);
    const input = screen.getByRole("textbox", { name: "Message" });
    await user.type(input, "Hello ");
    await user.click(screen.getByRole("button", { name: "Mention a user" }));
    expect(screen.getAllByRole("option")).toHaveLength(5);
    await user.click(screen.getByRole("option", { name: /Carol/ }));
    await user.click(screen.getByRole("button", { name: "Choose emoji" }));
    await user.type(
      screen.getByRole("textbox", { name: "Search emojis" }),
      "wave",
    );
    await user.click(screen.getByRole("button", { name: "wave hello hand" }));
    expect(input).toHaveValue("Hello @Carol 👋");
    await user.click(screen.getByRole("button", { name: /Send/ }));
    expect(publish).toHaveBeenCalledWith(
      "message:send",
      expect.objectContaining({
        text: "Hello @Carol 👋",
        requestId: expect.any(String),
      }),
    );
    await waitFor(() => expect(input).toHaveValue(""));
  });
  it("filters typed mentions and supports keyboard selection", async () => {
    render(<Composer connected publish={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: "Message" });
    await userEvent.type(input, "@de{Enter}");
    expect(input).toHaveValue("@Dean ");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
  it("preserves draft and reuses its request ID when retrying a failed send", async () => {
    const publish = vi
      .fn()
      .mockRejectedValueOnce(new Error("Confirmation timed out. Please retry."))
      .mockResolvedValueOnce({});
    render(<Composer connected publish={publish} />);
    await userEvent.type(
      screen.getByRole("textbox", { name: "Message" }),
      "Keep my draft",
    );
    await userEvent.click(screen.getByRole("button", { name: /Send/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Confirmation timed out",
    );
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(
      "Keep my draft",
    );
    await userEvent.click(screen.getByRole("button", { name: /Send/ }));
    expect(publish.mock.calls[0][1].requestId).toBe(
      publish.mock.calls[1][1].requestId,
    );
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(""),
    );
  });
  it("deduplicates server echoes and never regresses like counts on delayed acknowledgements", () => {
    const initial = [{ id: "1", text: "hello", likes: 3 }];
    expect(mergeMessage(initial, { id: "1", text: "hello", likes: 1 })).toEqual(
      initial,
    );
    expect(
      mergeMessage(initial, { id: "2", text: "new", likes: 0 }),
    ).toHaveLength(2);
  });
});
