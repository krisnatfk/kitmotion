import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo } from "./logo";

describe("Logo variants", () => {
  it("renders a transparent light mark without the wordmark", () => {
    const { container } = render(<Logo href={null} variant="mark" tone="light" />);
    expect(screen.getByRole("img", { name: "KITMOTION" })).toBeInTheDocument();
    expect(screen.queryByText("KITMOTION")).not.toBeInTheDocument();
    expect(container.querySelector('[data-logo-part="mark"]')).toHaveStyle({
      backgroundImage: "url(/brand/kitmotion-mark-light.png)",
    });
  });

  it("renders wordmark-only for dark surfaces", () => {
    const { container } = render(<Logo href={null} variant="wordmark" tone="light" />);
    expect(screen.getByText("KITMOTION")).toHaveClass("text-white");
    expect(container.querySelector('[data-logo-part="mark"]')).toBeNull();
  });

  it("renders mark and wordmark as a dark lockup", () => {
    const { container } = render(<Logo href={null} variant="lockup" tone="dark" />);
    expect(container.querySelector('[data-logo-part="mark"]')).toBeTruthy();
    expect(screen.getByText("KITMOTION")).toHaveClass("text-sport-black");
  });
});
