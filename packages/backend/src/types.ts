import type { DefineEvents, SDK } from "caido:plugin";

export type TorSettings = {
  autoStart: boolean;
  autoCheckUpdates: boolean;
  port: number;
  installedVersion: string | undefined;
  binaryPath: string | undefined;
  upstreamProxyId: string | undefined;
  includeHosts: string[];
  excludeHosts: string[];
};

export type TorState = "idle" | "starting" | "running" | "stopping" | "error";

export type TorStatus = {
  state: TorState;
  version: string | undefined;
  updateAvailable: boolean;
  latestVersion: string | undefined;
  error: string | undefined;
};

export type Result<T> =
  | { kind: "Ok"; value: T }
  | { kind: "Error"; error: string };

export type TorVersionInfo = {
  binary: string;
  version: string;
  sig: string;
  git_tag: string;
};

export type TestConnectionResult = {
  isTor: boolean;
  ip: string;
};

export type BackendEvents = DefineEvents<{
  "status-changed": (status: TorStatus) => void;
}>;

export type CaidoBackendSDK = SDK<never, BackendEvents>;
