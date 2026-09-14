import { createTRPCNuxtClient, httpBatchLink } from "trpc-nuxt/client";
import type { AppRouter } from "~~/server/trpc/routers";

const getClient = () =>
  createTRPCNuxtClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "/api/trpc",
      }),
    ],
  });

let client: ReturnType<typeof getClient>;

export const useTrpcClient = () => {
  if (import.meta.client && client) return client;
  client = getClient();
  return client;
};

export const useTeamsList = () => useTrpcClient().teams.list.useQuery();

export const useTeam = (id: string) =>
  useTrpcClient().teams.get.useQuery({
    teamIdentifier: id,
  });
