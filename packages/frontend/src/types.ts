import { type Caido } from "@caido/sdk-frontend";
import { type API, type BackendEvents } from "backend";

export type FrontendSDK = Caido<API, BackendEvents>;

export type TorSettings = {
  autoStart: boolean;
  autoCheckUpdates: boolean;
  port: number;
  installedVersion: string | undefined;
  binaryPath: string | undefined;
  upstreamProxyId: string | undefined;
  includeHosts: string[];
  excludeHosts: string[];
  pluginPath: string;
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

export type TestConnectionResult = {
  isTor: boolean;
  ip: string;
};
