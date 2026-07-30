import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExerciseMotionDemo } from "./motion-demo";

describe("ExerciseMotionDemo", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("renders and controls the local tutorial video for a supported exercise", () => {
    render(<ExerciseMotionDemo slug="squat" exerciseName="Squat" />);

    expect(screen.getByLabelText("Video tutorial gerakan Squat")).toHaveAttribute(
      "src",
      "/tutorials/squat-3d.mp4",
    );
    fireEvent.click(screen.getByRole("button", { name: "Putar video tutorial" }));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();

    const video = screen.getByLabelText("Video tutorial gerakan Squat");
    fireEvent.play(video);
    Object.defineProperty(video, "paused", { configurable: true, get: () => false });
    fireEvent.click(screen.getByRole("button", { name: "Jeda video tutorial" }));
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it("prefers a configured animation_url over the local fallback", () => {
    render(
      <ExerciseMotionDemo
        slug="squat"
        exerciseName="Squat"
        animationUrl="/tutorials/squat.webm"
      />,
    );

    expect(screen.getByLabelText("Video tutorial gerakan Squat")).toHaveAttribute(
      "src",
      "/tutorials/squat.webm",
    );
  });
});
