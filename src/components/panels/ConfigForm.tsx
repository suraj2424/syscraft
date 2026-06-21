/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Field, NumberInput, SelectInput, ToggleInput } from "./ConfigFields";

interface ConfigFormProps {
  nodeType: string;
  config: any;
  nodeId: string;
  onChange: (id: string, patch: any) => void;
}

export function ConfigForm({ nodeType, config, nodeId, onChange }: ConfigFormProps) {
  switch (nodeType) {
    case "client":
      return (
        <>
          <Field label="RPS">
            <NumberInput value={config.rps} onChange={(v) => onChange(nodeId, { rps: v })} min={1} max={100000} />
          </Field>
          <Field label="Payload KB">
            <NumberInput value={config.payloadSizeKB} onChange={(v) => onChange(nodeId, { payloadSizeKB: v })} min={1} max={1024} />
          </Field>
          <Field label="Read Ratio">
            <NumberInput value={config.readWriteRatio} onChange={(v) => onChange(nodeId, { readWriteRatio: Math.min(1, Math.max(0, v)) })} min={0} max={1} step={0.1} />
          </Field>
        </>
      );
    case "loadBalancer":
      return (
        <Field label="Algorithm">
          <SelectInput
            value={config.algorithm}
            options={[
              { value: "round-robin", label: "Round Robin" },
              { value: "least-connections", label: "Least Connections" },
              { value: "ip-hash", label: "IP Hash" },
            ]}
            onChange={(v) => onChange(nodeId, { algorithm: v })}
          />
        </Field>
      );
    case "apiGateway":
      return (
        <>
          <Field label="Rate Limit">
            <NumberInput value={config.rateLimitRps} onChange={(v) => onChange(nodeId, { rateLimitRps: v })} min={100} max={100000} />
          </Field>
          <Field label="Auth">
            <ToggleInput value={config.authEnabled} onChange={(v) => onChange(nodeId, { authEnabled: v })} />
          </Field>
        </>
      );
    case "webServer":
      return (
        <>
          <Field label="Max Concurrent">
            <NumberInput value={config.maxConcurrent} onChange={(v) => onChange(nodeId, { maxConcurrent: v })} min={1} max={10000} />
          </Field>
          <Field label="Process Time ms">
            <NumberInput value={config.processingTimeMs} onChange={(v) => onChange(nodeId, { processingTimeMs: v })} min={1} max={10000} />
          </Field>
          <Field label="Failure Rate">
            <NumberInput value={config.failureRate} onChange={(v) => onChange(nodeId, { failureRate: Math.min(1, Math.max(0, v)) })} min={0} max={1} step={0.01} />
          </Field>
        </>
      );
    case "cache":
      return (
        <>
          <Field label="Size MB">
            <NumberInput value={config.sizeMB} onChange={(v) => onChange(nodeId, { sizeMB: v })} min={1} max={65536} />
          </Field>
          <Field label="TTL sec">
            <NumberInput value={config.ttlSec} onChange={(v) => onChange(nodeId, { ttlSec: v })} min={1} max={86400} />
          </Field>
          <Field label="Eviction">
            <SelectInput
              value={config.evictionPolicy}
              options={[
                { value: "LRU", label: "LRU" },
                { value: "LFU", label: "LFU" },
              ]}
              onChange={(v) => onChange(nodeId, { evictionPolicy: v })}
            />
          </Field>
          <Field label="Hit Rate">
            <NumberInput value={config.hitRate} onChange={(v) => onChange(nodeId, { hitRate: Math.min(1, Math.max(0, v)) })} min={0} max={1} step={0.05} />
          </Field>
        </>
      );
    case "sqlDb":
    case "noSqlDb":
      return (
        <>
          <Field label="Replication">
            <SelectInput
              value={config.replicationMode}
              options={[
                { value: "single", label: "Single" },
                { value: "master-slave", label: "Master-Slave" },
              ]}
              onChange={(v) => onChange(nodeId, { replicationMode: v })}
            />
          </Field>
          <Field label="Read Throughput">
            <NumberInput value={config.maxReadThroughput} onChange={(v) => onChange(nodeId, { maxReadThroughput: v })} min={1} max={100000} />
          </Field>
          <Field label="Write Throughput">
            <NumberInput value={config.maxWriteThroughput} onChange={(v) => onChange(nodeId, { maxWriteThroughput: v })} min={1} max={100000} />
          </Field>
          <Field label="Repl Lag ms">
            <NumberInput value={config.replicationLagMs} onChange={(v) => onChange(nodeId, { replicationLagMs: v })} min={0} max={10000} />
          </Field>
        </>
      );
    case "messageQueue":
      return (
        <>
          <Field label="Max Queue">
            <NumberInput value={config.maxQueueSize} onChange={(v) => onChange(nodeId, { maxQueueSize: v })} min={100} max={1000000} />
          </Field>
          <Field label="Process Rate">
            <NumberInput value={config.processingRate} onChange={(v) => onChange(nodeId, { processingRate: v })} min={1} max={100000} />
          </Field>
        </>
      );
    default:
      return null;
  }
}
