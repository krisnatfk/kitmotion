# IoT Integration Contract — Future Phase

> **Status:** Future-ready, NOT active. This document describes the contract a
> future IoT necklace integration must satisfy. Nothing here is implemented today.

## 1. Current state

The application-first MVP uses **only the camera** for pose detection, repetition
counting, and scoring. There is:

- no device page, pairing, or QR flow;
- no `devices`, `device_bindings`, or `device_telemetry_*` table;
- no `/api/iot/*` endpoint;
- no ESP32 / MPU6050 firmware;
- no Bluetooth or Wi-Fi provisioning;
- no sensor fusion;
- no influence of sensor data on score;
- no bonus XP for using a device.

The only IoT-related code that exists is the **interface and no-op adapter** under
`src/features/sensor-integration/`, plus the `sensor_source` / `sensor_summary`
optional columns on `workout_sessions` (always `'none'` / `NULL` today).

## 2. The integration seam

The workout session depends on the `SensorProvider` interface, never on a concrete
provider. Today the dependency is wired as:

```ts
const sensorProvider: SensorProvider = new NoopSensorProvider();
```

Swapping in a real provider is the **only** change required at the session level:

```ts
const sensorProvider: SensorProvider = featureFlags.iotIntegrationEnabled
  ? new IoTSensorProvider({ ... })
  : new NoopSensorProvider();
```

The engine itself never knows about IoT (architecture rule §9 / rules.md §9).

## 3. Interface (source of truth: architecture.md §7)

```ts
type SensorConnectionStatus =
  | "unavailable" | "disabled" | "connecting"
  | "connected" | "disconnected" | "error";

type SensorSample = {
  timestampMs: number;
  acceleration?: { x: number; y: number; z: number };
  gyroscope?: { x: number; y: number; z: number };
};

type SensorSessionSummary = {
  source: "none" | "iot-necklace";
  sampleCount: number;
  connectedDurationMs: number;
  stabilityIndex?: number;
  tempoVariability?: number;
};

interface SensorProvider {
  getStatus(): SensorConnectionStatus;
  startSession(): Promise<void>;
  stopSession(): Promise<SensorSessionSummary>;
  subscribe(listener: (sample: SensorSample) => void): () => void;
}
```

## 4. Activation checklist (do NOT do any of this in the current phase)

When hardware + a device-auth protocol are final, the future phase must:

1. Set `NEXT_PUBLIC_IOT_INTEGRATION_ENABLED=true` (env). `featureFlags.iotIntegrationEnabled` reads this.
2. Implement `IoTSensorProvider` satisfying the interface — placed under a new `src/features/iot/` (does not exist yet).
3. Add the device/telemetry schema as a **new** migration (never edit existing migrations). Existing `workout_sessions.sensor_source` already accepts `'iot_necklace'`; `sensor_summary` stores the `SensorSessionSummary` JSON.
4. Add device auth endpoints under `/api/iot/*` with their own rate limiting + device secret rotation.
5. Keep scoring **versioned** (`scoring_version`). A new `cam-iot-v1` scoring version may blend sensor-derived tempo/stability, but **old sessions must not change** (rules.md §10.6).

## 5. Hard rules that survive into the future phase

- The engine must remain IoT-agnostic.
- Sensor data may inform `tempo` and `stability` sub-scores only via a **new** scoring version; `form` and `range` stay camera-derived.
- Rewards stay idempotent (`xp_events.idempotency_key`).
- Camera frames and raw sensor samples are never stored or sent to the server; only the `SensorSessionSummary` is persisted.
