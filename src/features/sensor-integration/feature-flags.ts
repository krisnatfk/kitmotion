import { env } from "@/lib/env";

/**
 * Feature flags for future capabilities. The IoT flag MUST stay false for the
 * application-first MVP — there are no IoT endpoints, tables, or firmware yet.
 *
 * When a real necklace + device-auth protocol exist, flipping this true (via
 * NEXT_PUBLIC_IOT_INTEGRATION_ENABLED) and swapping in an IoTSensorProvider is
 * the intended activation path. UI gates on this flag to hide any device menu.
 */
export const featureFlags = {
  iotIntegrationEnabled: env.iotIntegrationEnabled,
} as const;

/**
 * Resolve the active sensor provider. Always NoopSensorProvider today.
 * When IoT is ready, this is the single switch-point: return an
 * IoTSensorProvider when the flag is true and a provider is available.
 */
export async function resolveSensorProvider() {
  const { NoopSensorProvider } = await import("./noop-sensor-provider");
  return new NoopSensorProvider();
}
