import { defineStore } from "pinia";
import type { RouterOutput } from "~~/server/trpc/routers";

type Team = RouterOutput["teams"]["get"] | RouterOutput["teams"]["list"][0];
type Teams = Record<string, Team>;

export const useTeamsStore = defineStore("teams", {
  state: () => ({
    teams: {} as Teams,
    currentTeamId: null as string | null,
    loaded: false,
  }),

  getters: {
    currentTeam(): Team | null {
      return this.currentTeamId ? this.teams[this.currentTeamId] || null : null;
    },

    getTeam:
      (state) =>
      (id: string): Team | null => {
        return state.teams[id] || null;
      },

    allTeams(): Team[] {
      return Object.values(this.teams);
    },
  },

  actions: {
    setCurrentTeamId(id: string | null) {
      this.currentTeamId = id;
    },

    setTeam(team: Team) {
      if (!team) return;
      this.teams[team.slug] = team;
    },

    setTeams(teams: Team[]) {
      this.teams = teams.reduce((acc, team) => {
        acc[team.slug] = team;
        return acc;
      }, {} as Teams);
      this.loaded = true;
    },

    async fetchTeam(id: string) {
      try {
        const team = await useTrpcClient().teams.get.query({
          teamIdentifier: id,
        });

        this.setTeam(team);
        return team;
      } catch (error) {
        console.error(error);
        return null;
      }
    },

    async fetchCurrentTeam() {
      if (!this.currentTeamId) return null;
      return this.fetchTeam(this.currentTeamId);
    },

    async fetchAllTeams() {
      try {
        const teams = await useTrpcClient().teams.list.query();
        this.setTeams(teams);
        return teams;
      } catch (error) {
        console.error(error);
      }
    },
  },
});

export const useCurrentTeam = () => storeToRefs(useTeamsStore()).currentTeam;
