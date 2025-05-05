import 'dotenv/config';
import {
  ChatInputCommandInteraction,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  CommandInteraction,
  SlashCommandBuilder,
  REST,
  Routes
} from "discord.js";
import { IStorage } from "../storage";

const applicationID: string = process.env.APPLICATION_ID!;

function formatDate(dt: Date): string {
  const day = dt.getDate().toString().padStart(2, "0");
  const month = (dt.getMonth() + 1).toString().padStart(2, "0");
  return `${day}-${month}`;
}

// Helper to wait for a modal submission with a filter.
function waitForModalSubmit(
  client: any,
  customId: string,
  userId: string,
  time: number = 60000
): Promise<ModalSubmitInteraction> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.removeListener("interactionCreate", handler);
      reject(new Error("Modal submission timed out."));
    }, time);
    const handler = (i: any) => {
      if (i.isModalSubmit() && i.customId === customId && i.user.id === userId) {
        clearTimeout(timer);
        client.removeListener("interactionCreate", handler);
        resolve(i);
      }
    };
    client.on("interactionCreate", handler);
  });
}

export function registerCommands(storage: IStorage) {
  const commandFunctions: Record<string, (interaction: ChatInputCommandInteraction) => Promise<void>> = {
    "create-team": async (interaction: CommandInteraction) => {
      if (!interaction.isChatInputCommand()) return;

      // Build the modal for team creation.
      const teamModal = new ModalBuilder()
          .setCustomId("createTeamModal")
          .setTitle("Create Team");

      const teamNameInput = new TextInputBuilder()
          .setCustomId("team_name")
          .setLabel("Team Name")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Enter your team name")
          .setRequired(true);

      const inGameIdInput = new TextInputBuilder()
          .setCustomId("in_game_id")
          .setLabel("In-Game ID")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Enter your in-game ID without server ID (e.g. 1234567)")
          .setRequired(true);

      teamModal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(teamNameInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(inGameIdInput)
      );

      // Show the modal to the user.
      await interaction.showModal(teamModal);

      try {
        // Wait for the modal submission.
        const modalSubmit = await interaction.awaitModalSubmit({
          filter: (i: any) =>
              i.customId === "createTeamModal" && i.user.id === interaction.user.id,
          time: 60000
        });
        const teamName = modalSubmit.fields.getTextInputValue("team_name");
        const inGameId = modalSubmit.fields.getTextInputValue("in_game_id");

        // Check if a team with this name already exists.
        const existingTeam = await storage.getTeamByName(teamName);
        if (existingTeam) {
          await modalSubmit.reply({
            content: `A team named \`${teamName}\` already exists. Please choose a different name.`,
            ephemeral: true
          });
          return;
        }

        // Ensure the user is not already in a team.
        const existingMember = await storage.getTeamMemberByDiscordId(interaction.user.id);
        if (existingMember) {
          const team = await storage.getTeam(existingMember.teamId);
          await modalSubmit.reply({
            content: `You are already a member of the team \`${team?.name}\`. Please leave that team first.`,
            ephemeral: true
          });
          return;
        }

        // Create the team and add the user as captain.
        const team = await storage.createTeam({
          name: teamName,
          captainDiscordId: interaction.user.id,
          captainUsername: interaction.user.tag,
          captainInGameId: inGameId
        });

        await storage.createTeamMember({
          teamId: team.id,
          discordId: interaction.user.id,
          username: interaction.user.tag,
          inGameId: inGameId,
          isCaptain: true
        });

        await modalSubmit.reply({
          content: `Team \`${teamName}\` has been created with <@${interaction.user.id}> as the captain!`,
          ephemeral: false
        });
      } catch (err) {
        await interaction.followUp({
          content: "No submission was made in time.",
          ephemeral: true
        });
      }
    },

    "join-team": async (interaction: CommandInteraction) => {
      if (!interaction.isChatInputCommand()) return;

      const teamName = interaction.options.getString("team_name", true);
      const inGameId = interaction.options.getString("in_game_id", true);

      const team = await storage.getTeamByName(teamName);
      if (!team) {
        await interaction.reply({
          content: `Team "${teamName}" does not exist. Please check the team name.`,
          ephemeral: true
        });
        return;
      }

      const existingMember = await storage.getTeamMemberByDiscordId(interaction.user.id);
      if (existingMember) {
        const existingTeam = await storage.getTeam(existingMember.teamId);
        await interaction.reply({
          content: `You are already a member of the team "${existingTeam?.name}". Please leave that team first.`,
          ephemeral: true
        });
        return;
      }

      await storage.createTeamMember({
        teamId: team.id,
        discordId: interaction.user.id,
        username: interaction.user.tag,
        inGameId: inGameId,
        isCaptain: false
      });

      await interaction.reply({
        content: `You have joined team "${teamName}"!`,
        ephemeral: false
      });
    },

    "schedule-scrim": async (interaction: ChatInputCommandInteraction) => {
      if (!interaction.isChatInputCommand()) return;
      const member = await storage.getTeamMemberByDiscordId(interaction.user.id);
      if (!member || !member.isCaptain) {
        await interaction.reply({
          content: "Only team captains can schedule scrims.",
          ephemeral: true,
        });
        return;
      }

      // Create a modal with three text inputs: Date, Time, and Number of Games.
      const scrimModal = new ModalBuilder()
          .setCustomId("scrimModal")
          .setTitle("Schedule Scrim");

      const dateInput = new TextInputBuilder()
          .setCustomId("custom_date")
          .setLabel("Enter Date (DD-MM)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("e.g. 25-12")
          .setRequired(true);

      const timeInput = new TextInputBuilder()
          .setCustomId("custom_time")
          .setLabel("Enter Time (HH:MM)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("e.g. 21:30")
          .setRequired(true);

      const gamesInput = new TextInputBuilder()
          .setCustomId("games_input")
          .setLabel("Enter Number of Games")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("e.g. 3")
          .setRequired(true);

      scrimModal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(dateInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(timeInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(gamesInput)
      );

      // Show modal and await submission.
      await interaction.showModal(scrimModal);

      try {
        const modalSubmit = await interaction.awaitModalSubmit({
          filter: (i: any) =>
              i.customId === "scrimModal" && i.user.id === interaction.user.id,
          time: 60000
        });
        const selectedDate = modalSubmit.fields.getTextInputValue("custom_date");
        const selectedTime = modalSubmit.fields.getTextInputValue("custom_time");
        const numberOfGames = parseInt(modalSubmit.fields.getTextInputValue("games_input"), 10);

        // Create the scrim with the provided values.
        const scrim = await storage.createScrim({
          team1Id: member.teamId,
          date: selectedDate,
          time: selectedTime,
          status: "open",
          games: numberOfGames,
        });
        await modalSubmit.reply({
          content: `Scrim scheduled for ${selectedDate} at ${selectedTime} (ID: ${scrim.id}) with ${numberOfGames} games.`,
          ephemeral: true,
        });
      } catch (err) {
        await interaction.followUp({
          content: "No submission was made in time.",
          ephemeral: true,
        });
        return;
      }
    },

    "scrims": async (interaction: ChatInputCommandInteraction) => {
      if (!interaction.isChatInputCommand()) return;

      const member = await storage.getTeamMemberByDiscordId(interaction.user.id);
      if (!member || !member.isCaptain) {
        await interaction.reply({
          content: "Only team captains can join scrims.",
          ephemeral: true
        });
        return;
      }

      const scrims = await storage.getOpenScrims();
      if (!scrims || scrims.length === 0) {
        await interaction.reply({
          content: "No available scrims to join.",
          ephemeral: true
        });
        return;
      }

      const options = scrims.map(scrim => {
        return {
          label: `Scrim ${scrim.id}`,
          description: `${scrim.date} at ${scrim.time}`,
          value: scrim.id.toString()
        };
      });

      const scrimSelect = new StringSelectMenuBuilder()
          .setCustomId("select_scrim")
          .setPlaceholder("Select a scrim to join")
          .addOptions(options);

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(scrimSelect);

      const replyMsg = await interaction.reply({
        content: "Select the scrim you want to join:",
        components: [row],
        ephemeral: true,
        fetchReply: true
      });

      const filter = (i: any) => i.customId === "select_scrim" && i.user.id === interaction.user.id;
      try {
        const selection = await (replyMsg as any).awaitMessageComponent({ filter, time: 60000 });
        const selectedScrimId = parseInt(selection.values[0], 10);
        const scrim = await storage.getScrim(selectedScrimId);
        if (!scrim) {
          await selection.update({
            content: "Selected scrim no longer exists.",
            components: []
          });
          return;
        }
        if (scrim.status !== "open") {
          await selection.update({
            content: "This scrim is no longer open for joining.",
            components: []
          });
          return;
        }
        if (scrim.team1Id === member.teamId) {
          await selection.update({
            content: "Your team is already participating in this scrim.",
            components: []
          });
          return;
        }
        await storage.updateScrim(selectedScrimId, {
          team2Id: member.teamId,
          status: "scheduled"
        });
        const team1 = await storage.getTeam(scrim.team1Id);
        const team2 = await storage.getTeam(member.teamId);
        await selection.update({
          content: `Team "${team2?.name}" has joined the scrim against "${team1?.name}" scheduled for ${scrim.date} at ${scrim.time}!`,
          components: []
        });
      } catch (err) {
        await interaction.editReply({
          content: "No selection was made in time.",
          components: []
        });
      }
    }
  };

  if (process.env.REGISTER_COMMANDS === "true" && process.env.DISCORD_BOT_TOKEN && process.env.APPLICATION_ID) {
    const commands = [
      new SlashCommandBuilder()
        .setName("create-team")
        .setDescription("Create a new team (Team Captain)"),

      new SlashCommandBuilder()
        .setName("join-team")
        .setDescription("Join an existing team (Team Player)")
        .addStringOption(option =>
          option.setName("team_name")
            .setDescription("Name of the team to join")
            .setRequired(true))
        .addStringOption(option =>
          option.setName("in_game_id")
            .setDescription("Your in-game ID")
            .setRequired(true)),

      new SlashCommandBuilder()
        .setName("schedule-scrim")
        .setDescription("Schedule a new scrim (Team Captain)"),

      new SlashCommandBuilder()
        .setName("scrims")
        .setDescription("Display currently available scrims to join.")
    ];

    const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

    (async () => {
      try {
        console.log("Started refreshing application (/) commands.");
        await rest.put(
          Routes.applicationCommands(applicationID),
          { body: commands }
        );
        console.log("Successfully reloaded application (/) commands.");
      } catch (error) {
        console.error(error);
      }
    })();
  }

  return commandFunctions;
}