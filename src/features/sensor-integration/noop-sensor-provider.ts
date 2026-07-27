import type { SensorProvider } from "./sensor-provider";
import type {
  SensorConnectionStatus,
  SensorSample,
  SensorSessionSummary,
} from "./sensor-types";

/**
 * The default — and, for the application-first MVP, only — sensor provider.
 *
 * Produces no samples, holds no interval, makes no network request, and reports
 * `disabled`. It exists purely so the workout session can depend on the
 * SensorProvider interface today, letting a real IoT provider replace it later
 * without touching the session core.
 */
export class NoopSensorProvider implements SensorProvider {
  getStatus(): SensorConnectionStatus {
    return "disabled";
  }

  async startSession(): Promise<void> {
    // Intentionally empty: no sensor stream to start.
  }

  async stopSession(): Promise<SensorSessionSummary> {
    return {
      source: "none",
      sampleCount: 0,
      connectedDurationMs: 0,
    };
  }

  subscribe(_listener: (sample: SensorSample) => void): () => void {
    // No samples are ever emitted; return a no-op unsubscribe.
    void _listener;
    return () => {};
  }
}
