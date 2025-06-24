import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertTeamSchema, 
  insertTeamMemberSchema, 
  insertScrimSchema 
} from "@shared/schema";
import { ZodError } from "zod";
import { WebSocketServer } from "ws";
import { setupBot } from "./discord/bot";
import { syncTeamRoles, deleteTeamResources } from "./discord/roles";
import 'dotenv/config';

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup WebSocket for real-time updates
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });
  
  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    
    ws.on("message", (message) => {
      try {
        console.log("Received message:", message.toString());
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    });
    
    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
    
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
    
    // Send initial ping to verify connection
    try {
      ws.send(JSON.stringify({ type: "connection-established", data: { status: "connected" } }));
    } catch (error) {
      console.error("Error sending initial WebSocket message:", error);
    }
  });
  
  // Broadcast updates to all connected clients
  const broadcastUpdate = (type: string, data: any) => {
    wss.clients.forEach((client) => {
      try {
        if (client.readyState === 1) { // OPEN
          client.send(JSON.stringify({ type, data }));
        }
      } catch (error) {
        console.error("Error broadcasting update:", error);
      }
    });
  };
  
  // API error handler middleware
  const handleError = (err: Error, res: Response) => {
    console.error(err);
    
    if (err instanceof ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: err.errors
      });
    }
    
    return res.status(500).json({ message: err.message });
  };
  
  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "OK" });
  });
  
  // Team routes
  app.get("/api/teams", async (_req, res) => {
    try {
      const teams = await storage.getTeamsWithMembers();
      res.json(teams);
    } catch (err) {
      handleError(err as Error, res);
    }
  });
  
  app.post("/api/teams", async (req, res) => {
    try {
      const validatedData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(validatedData);
      
      // Create captain as first team member
      const captainMember = {
        teamId: team.id,
        discordId: team.captainDiscordId,
        username: team.captainUsername,
        inGameId: team.captainInGameId,
        isCaptain: true
      };
      
      await storage.createTeamMember(captainMember);
      
      const result = await storage.getTeamsWithMembers();
      broadcastUpdate("teams-updated", result);
      
      res.status(201).json(team);
    } catch (err) {
      handleError(err as Error, res);
    }
  });
  
  app.get("/api/teams/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const team = await storage.getTeam(id);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      const members = await storage.getTeamMembers(id);
      res.json({ ...team, members });
    } catch (err) {
      handleError(err as Error, res);
    }
  });
  
  app.put("/api/teams/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const team = await storage.getTeam(id);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      const validatedData = insertTeamSchema.partial().parse(req.body);
      const updatedTeam = await storage.updateTeam(id, validatedData);
      const all = await storage.getTeamsWithMembers();
      broadcastUpdate("teams-updated", all);
      
      try {
        if (updatedTeam && team) {
          await syncTeamRoles(updatedTeam, team);
        } else if (updatedTeam) {
          await syncTeamRoles(updatedTeam);
        }
      } catch(err) {
        console.error("Failed to sync team roles:", err);
      }
      
      const result = await storage.getTeamsWithMembers();
      broadcastUpdate("teams-updated", result);
      
      res.json(updatedTeam);
    } catch (err) {
      handleError(err as Error, res);
    }
  });
  
  app.delete("/api/teams/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const team = await storage.getTeam(id);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      try {
        await deleteTeamResources(team);
      } catch (error) {
        console.error("Error cleaning up Discord resources:", error);
      }
      
      await storage.deleteTeam(id);
      
      const result = await storage.getTeamsWithMembers();
      broadcastUpdate("teams-updated", result);
      
      res.status(204).send();
    } catch (err) {
      handleError(err as Error, res);
    }
  });
  
  // Team member routes
  app.post("/api/team-members", async (req, res) => {
    try {
      const validatedData = insertTeamMemberSchema.parse(req.body);
      const teamMember = await storage.createTeamMember(validatedData);
      const team = await storage.getTeam(teamMember.teamId)!;
      await syncTeamRoles(team!);
      
      const result = await storage.getTeamsWithMembers();
      broadcastUpdate("teams-updated", result);
      
      res.status(201).json(teamMember);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  // Team member update route
  app.put("/api/team-members/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedMember = await storage.updateTeamMember(id, req.body);
      const team = await storage.getTeam(updatedMember!.teamId);
      await syncTeamRoles(team!);
      if (!updatedMember) {
        return res.status(404).json({ message: "Team member not found" });
      }
      const result = await storage.getTeamsWithMembers();
      broadcastUpdate("teams-updated", result);
      res.json(updatedMember);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.delete("/api/team-members/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const member = await storage.getTeamMember(id);
      
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }
      const memberListBefore = await storage.getTeamMembers(member.teamId);
      await storage.deleteTeamMember(id);
      const teamAfter = await storage.getTeam(member.teamId)!;
      await syncTeamRoles(teamAfter!, { ...teamAfter!, id: teamAfter!.id });
      
      const result = await storage.getTeamsWithMembers();
      broadcastUpdate("teams-updated", result);
      
      res.status(204).send();
    } catch (err) {
      handleError(err as Error, res);
    }
  });
  
  // Scrim routes
  app.get("/api/scrims", async (_req, res) => {
    try {
      const scrims = await storage.getScrimsWithTeams();
      res.json(scrims);
    } catch (err) {
      handleError(err as Error, res);
    }
  });
  
  app.post("/api/scrims", async (req, res) => {
    try {
      const validatedData = insertScrimSchema.parse(req.body);
      const scrim = await storage.createScrim(validatedData);
      
      const result = await storage.getScrimsWithTeams();
      broadcastUpdate("scrims-updated", result);
      
      res.status(201).json(scrim);
    } catch (err) {
      handleError(err as Error, res);
    }
  });
  
  app.get("/api/scrims/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const scrim = await storage.getScrim(id);
      
      if (!scrim) {
        return res.status(404).json({ message: "Scrim not found" });
      }
      
      const team1 = await storage.getTeam(scrim.team1Id);
      const team2 = scrim.team2Id ? await storage.getTeam(scrim.team2Id) : undefined;
      
      res.json({
        ...scrim,
        team1Name: team1?.name,
        team2Name: team2?.name
      });
    } catch (err) {
      handleError(err as Error, res);
    }
  });
  
  app.put("/api/scrims/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const scrim = await storage.getScrim(id);
      
      if (!scrim) {
        return res.status(404).json({ message: "Scrim not found" });
      }
      
      const validatedData = insertScrimSchema.partial().parse(req.body);
      const updatedScrim = await storage.updateScrim(id, validatedData);
      
      const result = await storage.getScrimsWithTeams();
      broadcastUpdate("scrims-updated", result);
      
      res.json(updatedScrim);
    } catch (err) {
      handleError(err as Error, res);
    }
  });
  
  app.delete("/api/scrims/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const scrim = await storage.getScrim(id);
      
      if (!scrim) {
        return res.status(404).json({ message: "Scrim not found" });
      }
      
      await storage.deleteScrim(id);
      
      const result = await storage.getScrimsWithTeams();
      broadcastUpdate("scrims-updated", result);
      
      res.status(204).send();
    } catch (err) {
      handleError(err as Error, res);
    }
  });
  
  // Initialize Discord bot
  const token = process.env.DISCORD_BOT_TOKEN;
  if (token) {
    try {
      await setupBot(token, storage);
      console.log("Discord bot connected successfully");
    } catch (error) {
      console.error("Failed to start Discord bot:", error);
    }
  } else {
    console.warn("No Discord bot token provided, bot functionality disabled");
  }
  
  return httpServer;
}
