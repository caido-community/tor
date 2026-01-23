import type { CaidoBackendSDK, Result, TorSettings } from "./types";

type UpstreamProxySocks = {
  id: string;
  allowlist: string[];
  denylist: string[];
  enabled: boolean;
  includeDns: boolean;
  connection: {
    host: string;
    port: number;
    isTLS: boolean;
  };
};

type CreateUpstreamProxySocksResponse = {
  createUpstreamProxySocks: {
    proxy: UpstreamProxySocks | undefined;
  };
};

type UpdateUpstreamProxySocksResponse = {
  updateUpstreamProxySocks: {
    proxy: UpstreamProxySocks | undefined;
  };
};

type DeleteUpstreamProxySocksResponse = {
  deleteUpstreamProxySocks: {
    deletedId: string | undefined;
  };
};

type GetUpstreamProxiesSocksResponse = {
  upstreamProxiesSocks: UpstreamProxySocks[];
};

const CREATE_UPSTREAM_PROXY_MUTATION = `
  mutation CreateUpstreamProxySocks($input: CreateUpstreamProxySocksInput!) {
    createUpstreamProxySocks(input: $input) {
      proxy {
        id
        allowlist
        denylist
        enabled
        includeDns
        connection {
          host
          port
          isTLS
        }
      }
    }
  }
`;

const UPDATE_UPSTREAM_PROXY_MUTATION = `
  mutation UpdateUpstreamProxySocks($id: ID!, $input: UpdateUpstreamProxySocksInput!) {
    updateUpstreamProxySocks(id: $id, input: $input) {
      proxy {
        id
        allowlist
        denylist
        enabled
        includeDns
        connection {
          host
          port
          isTLS
        }
      }
    }
  }
`;

const DELETE_UPSTREAM_PROXY_MUTATION = `
  mutation DeleteUpstreamProxySocks($id: ID!) {
    deleteUpstreamProxySocks(id: $id) {
      deletedId
    }
  }
`;

const GET_UPSTREAM_PROXIES_QUERY = `
  query GetUpstreamProxySocks {
    upstreamProxiesSocks {
      id
      allowlist
      denylist
      enabled
      includeDns
      connection {
        host
        port
        isTLS
      }
    }
  }
`;

export async function createUpstreamProxy(
  sdk: CaidoBackendSDK,
  port: number,
  allowlist: string[],
  denylist: string[],
): Promise<Result<string>> {
  const response = await sdk.graphql.execute<CreateUpstreamProxySocksResponse>(
    CREATE_UPSTREAM_PROXY_MUTATION,
    {
      input: {
        connection: {
          host: "127.0.0.1",
          port,
          isTLS: false,
        },
        allowlist,
        denylist,
        enabled: true,
        includeDns: true,
      },
    },
  );

  if (response.errors !== undefined && response.errors.length > 0) {
    return {
      kind: "Error",
      error: response.errors.map((e) => e.message).join(", "),
    };
  }

  const proxy = response.data?.createUpstreamProxySocks.proxy;
  if (proxy === undefined) {
    return { kind: "Error", error: "Failed to create upstream proxy" };
  }

  sdk.console.log(`Created upstream SOCKS proxy with ID: ${proxy.id}`);
  return { kind: "Ok", value: proxy.id };
}

export async function updateUpstreamProxy(
  sdk: CaidoBackendSDK,
  id: string,
  port: number,
  allowlist: string[],
  denylist: string[],
  enabled: boolean,
): Promise<Result<void>> {
  const response = await sdk.graphql.execute<UpdateUpstreamProxySocksResponse>(
    UPDATE_UPSTREAM_PROXY_MUTATION,
    {
      id,
      input: {
        connection: {
          host: "127.0.0.1",
          port,
          isTLS: false,
        },
        allowlist,
        denylist,
        enabled,
        includeDns: true,
      },
    },
  );

  if (response.errors !== undefined && response.errors.length > 0) {
    return {
      kind: "Error",
      error: response.errors.map((e) => e.message).join(", "),
    };
  }

  if (response.data?.updateUpstreamProxySocks.proxy === undefined) {
    return { kind: "Error", error: "Failed to update upstream proxy" };
  }

  return { kind: "Ok", value: undefined };
}

export async function deleteUpstreamProxy(
  sdk: CaidoBackendSDK,
  id: string,
): Promise<Result<void>> {
  const response = await sdk.graphql.execute<DeleteUpstreamProxySocksResponse>(
    DELETE_UPSTREAM_PROXY_MUTATION,
    { id },
  );

  if (response.errors !== undefined && response.errors.length > 0) {
    return {
      kind: "Error",
      error: response.errors.map((e) => e.message).join(", "),
    };
  }

  return { kind: "Ok", value: undefined };
}

export async function getUpstreamProxy(
  sdk: CaidoBackendSDK,
  id: string,
): Promise<UpstreamProxySocks | undefined> {
  const response = await sdk.graphql.execute<GetUpstreamProxiesSocksResponse>(
    GET_UPSTREAM_PROXIES_QUERY,
  );
  if (response.errors !== undefined && response.errors.length > 0) {
    sdk.console.error(
      `Failed to get upstream proxy with ID ${id}: ${response.errors.map((e) => e.message).join(", ")}`,
    );
    return undefined;
  }
  if (response.data?.upstreamProxiesSocks === undefined) {
    return undefined;
  }

  return response.data.upstreamProxiesSocks.find((p) => p.id === id);
}

export async function ensureUpstreamProxy(
  sdk: CaidoBackendSDK,
  settings: TorSettings,
): Promise<Result<string>> {
  const allowlist = [
    ...new Set([...settings.includeHosts, "check.torproject.org"]),
  ];
  const denylist = settings.excludeHosts;

  if (settings.upstreamProxyId !== undefined) {
    const existing = await getUpstreamProxy(sdk, settings.upstreamProxyId);
    if (existing !== undefined) {
      const updateResult = await updateUpstreamProxy(
        sdk,
        settings.upstreamProxyId,
        settings.port,
        allowlist,
        denylist,
        true,
      );
      if (updateResult.kind === "Error") {
        return updateResult;
      }
      return { kind: "Ok", value: settings.upstreamProxyId };
    }
  }

  return createUpstreamProxy(sdk, settings.port, allowlist, denylist);
}

export async function disableUpstreamProxy(
  sdk: CaidoBackendSDK,
  id: string,
): Promise<Result<void>> {
  const existing = await getUpstreamProxy(sdk, id);
  if (existing === undefined) {
    return { kind: "Ok", value: undefined };
  }

  return updateUpstreamProxy(
    sdk,
    id,
    existing.connection.port,
    existing.allowlist,
    existing.denylist,
    false,
  );
}
