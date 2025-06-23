import { Client, GatewayIntentBits, Events } from "discord.js";
import { registerCommands } from "./commands";
import { IStorage } from "../storage";

export async function setupBot(token: string, storage: IStorage) {
  // Create a new client instance
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  let commandFunctions = {};

  // Listen for the client to be ready
  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Discord bot ready! Logged in as ${readyClient.user.tag}`);
    commandFunctions = registerCommands(storage);
  });

  // Handle interaction create events for slash commands
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    console.log(`Command received: ${interaction.commandName}`);

    try {
      // Pass command to the appropriate handler
      const commandFunctions = registerCommands(storage);
      const commandHandler = commandFunctions[interaction.commandName];
      
      if (commandHandler) {
        await commandHandler(interaction);
      } else {
        await interaction.reply({
          content: `Command not found: ${interaction.commandName}`,
          ephemeral: true
        });
      }
    } catch (error) {
      console.error(error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Reply with error if interaction hasn't been replied to
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: `Error: ${errorMessage}`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `Error: ${errorMessage}`,
          ephemeral: true
        });
      }
    }
  });

  // Login to Discord
  await client.login(token);
  
  return client;
}
