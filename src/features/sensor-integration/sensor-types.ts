/**
 * Sensor type contracts (architecture.md §7.1).
 *
 * These types describe the shape of a future IoT necklace provider. In the
 * application-first MVP only `source: "none"` is ever produced (NoopSensorProvider).
 * No IoT endpoint, table, or firmware exists yet — these types are the forward
 * contract so a real provider can be slotted in later without changing the
 * workout session core.
 */

export type SensorConnectionStatus =
  | "unavailable"
  | "disabled"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type SensorSample = {
  timestampMs: number;
  acceleration?: {
    x: number;
    y: number;
    z: number;
  };
  gyroscope?: {
    x: number;
    y: number;
    z: number;
  };
};

export type SensorSessionSummary = {
  source: "none" | "iot-necklace";
  sampleCount: number;
  connectedDurationMs: number;
  stabilityIndex?: number;
  tempoVariability?: number;
};
