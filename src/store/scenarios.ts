import { type Scenario } from "@/types/simulation";
import { scalingAndCachingScenarios } from "./scenarios/scalingAndCaching";
import { queueAndSpofScenarios } from "./scenarios/queueAndSpof";

export const SCENARIOS: Record<string, Scenario> = {
  ...scalingAndCachingScenarios,
  ...queueAndSpofScenarios,
};
