import type {
  SensorConnectionStatus,
  SensorSample,
  SensorSessionSummary,
} from "./sensor-types";

/**
 * Source of motion data alongside the camera. The application-first MVP always
 * uses {@link NoopSensorProvider}, which produces no samples and no summary.
 *
 * A future `IoTSensorProvider` will implement this same interface; the workout
 * session depends on the interface, never on a concrete provider, so swapping
 * the provider is the only change required when IoT is ready.
 *
 * Contract rules (architecture.md §7.3):
 *  - No device UI while `iotIntegrationEnabled` is false.
 *  - No IoT network requests.
 *  - No fake "connected" state, no mock telemetry in production.
 *  - The interface must not interfere with camera-driven scoring.
 */
export interface SensorProvider {
  getStatus(): SensorConnectionStatus;
  startSession(): Promise<void>;
  stopSession(): Promise<SensorSessionSummary>;
  subscribe(listener: (sample: SensorSample) => void): () => void;
}
