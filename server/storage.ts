import { 
  Team, InsertTeam, 
  TeamMember, InsertTeamMember, 
  Scrim, InsertScrim,
  TeamWithMembers, ScrimWithTeams
} from "@shared/schema";

// Storage Interface
export interface IStorage {
  // Team operations
  createTeam(team: InsertTeam): Promise<Team>;
  getTeams(): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  getTeamByName(name: string): Promise<Team | undefined>;
  updateTeam(id: number, team: Partial<Team>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;
  
  // Team member operations
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  getTeamMember(id: number): Promise<TeamMember | undefined>;
  getTeamMemberByDiscordId(discordId: string): Promise<TeamMember | undefined>;
  updateTeamMember(id: number, member: Partial<TeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: number): Promise<boolean>;
  
  // Scrim operations
  createScrim(scrim: InsertScrim): Promise<Scrim>;
  getScrims(): Promise<Scrim[]>;
  getScrim(id: number): Promise<Scrim | undefined>;
  updateScrim(id: number, scrim: Partial<Scrim>): Promise<Scrim | undefined>;
  deleteScrim(id: number): Promise<boolean>;
  getOpenScrims(): Promise<Scrim[]>;
  
  // Composite operations
  getTeamsWithMembers(): Promise<TeamWithMembers[]>;
  getScrimsWithTeams(): Promise<ScrimWithTeams[]>;
}

// In-memory Storage Implementation
export class MemStorage implements IStorage {
  private teams: Map<number, Team>;
  private teamMembers: Map<number, TeamMember>;
  private scrims: Map<number, Scrim>;
  private teamIdCounter: number;
  private memberIdCounter: number;
  private scrimIdCounter: number;

  constructor() {
    this.teams = new Map();
    this.teamMembers = new Map();
    this.scrims = new Map();
    this.teamIdCounter = 1;
    this.memberIdCounter = 1;
    this.scrimIdCounter = 1;
  }

  // Team operations
  async createTeam(team: InsertTeam): Promise<Team> {
    const id = this.teamIdCounter++;
    const newTeam: Team = { ...team, id };
    this.teams.set(id, newTeam);
    return newTeam;
  }

  async getTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeamByName(name: string): Promise<Team | undefined> {
    return Array.from(this.teams.values()).find(
      (team) => team.name.toLowerCase() === name.toLowerCase()
    );
  }

  async updateTeam(id: number, teamUpdate: Partial<Team>): Promise<Team | undefined> {
    const team = this.teams.get(id);
    if (!team) return undefined;
    
    const updatedTeam: Team = { ...team, ...teamUpdate };
    this.teams.set(id, updatedTeam);
    return updatedTeam;
  }

  async deleteTeam(id: number): Promise<boolean> {
    // Also delete all team members
    const teamMembers = await this.getTeamMembers(id);
    for (const member of teamMembers) {
      await this.deleteTeamMember(member.id);
    }
    
    // Delete any scrims that involve this team
    const scrims = Array.from(this.scrims.values());
    for (const scrim of scrims) {
      if (scrim.team1Id === id || scrim.team2Id === id) {
        await this.deleteScrim(scrim.id);
      }
    }
    
    return this.teams.delete(id);
  }

  // Team member operations
  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const id = this.memberIdCounter++;
    const newMember: TeamMember = { ...member, id };
    this.teamMembers.set(id, newMember);
    return newMember;
  }

  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values()).filter(
      (member) => member.teamId === teamId
    );
  }

  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    return this.teamMembers.get(id);
  }

  async getTeamMemberByDiscordId(discordId: string): Promise<TeamMember | undefined> {
    return Array.from(this.teamMembers.values()).find(
      (member) => member.discordId === discordId
    );
  }

  async updateTeamMember(id: number, memberUpdate: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const member = this.teamMembers.get(id);
    if (!member) {
      console.error(`Member with ID ${id} not found`);
      return undefined;
    }

    // If setting a new captain, clear any existing captain in the same team
    if (memberUpdate.isCaptain === true) {
      for (const [key, m] of this.teamMembers.entries()) {
        if (m.teamId === member.teamId && m.isCaptain && m.id !== id) {
          const updatedOther = { ...m, isCaptain: false };
          console.log(`Clearing captain status for member ${m.id}:`, m, "=>", updatedOther);
          this.teamMembers.set(key, updatedOther);
        }
      }
    }

    const updatedMember: TeamMember = { ...member, ...memberUpdate };
    console.log(`Updating member ${id} from`, member, 'to', updatedMember);
    this.teamMembers.set(id, updatedMember);
    return updatedMember;
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    return this.teamMembers.delete(id);
  }

  // Scrim operations
  async createScrim(scrim: InsertScrim): Promise<Scrim> {
    const id = this.scrimIdCounter++;
    const newScrim: Scrim = { 
      ...scrim, 
      id, 
      createdAt: new Date()
    };
    this.scrims.set(id, newScrim);
    return newScrim;
  }

  async getScrims(): Promise<Scrim[]> {
    return Array.from(this.scrims.values());
  }

  async getScrim(id: number): Promise<Scrim | undefined> {
    return this.scrims.get(id);
  }

  async getOpenScrims(): Promise<Scrim[]> {
    const now = new Date();
    const threshold = new Date(now.getTime() + 30 * 60000); // 30 minutes from now

    return Array.from(this.scrims.values()).filter(scrim => {
      if (scrim.status !== "open") return false;
      // Convert scrim.date (in "DD-MM" format) to a full date using the current year
      const [year, day, month] = scrim.date.split("-");
      const scrimDateTime = new Date(`${year}-${month}-${day}T${scrim.time}:00`);
      return scrimDateTime >= threshold;
    });
  }

  async updateScrim(id: number, scrimUpdate: Partial<Scrim>): Promise<Scrim | undefined> {
    const scrim = this.scrims.get(id);
    if (!scrim) return undefined;
    
    const updatedScrim: Scrim = { ...scrim, ...scrimUpdate };
    this.scrims.set(id, updatedScrim);
    return updatedScrim;
  }

  async deleteScrim(id: number): Promise<boolean> {
    return this.scrims.delete(id);
  }

  // Composite operations
  async getTeamsWithMembers(): Promise<TeamWithMembers[]> {
    const teams = await this.getTeams();
    const result: TeamWithMembers[] = [];
    
    for (const team of teams) {
      const members = await this.getTeamMembers(team.id);
      result.push({
        ...team,
        members
      });
    }
    
    return result;
  }

  async getScrimsWithTeams(): Promise<ScrimWithTeams[]> {
    const scrims = await this.getScrims();
    const result: ScrimWithTeams[] = [];
    
    for (const scrim of scrims) {
      const team1 = await this.getTeam(scrim.team1Id);
      const team2 = scrim.team2Id ? await this.getTeam(scrim.team2Id) : undefined;
      
      result.push({
        ...scrim,
        team1Name: team1?.name || "Unknown Team",
        team2Name: team2?.name
      });
    }
    
    return result;
  }
}

// Create and export the storage instance
export const storage = new MemStorage();
