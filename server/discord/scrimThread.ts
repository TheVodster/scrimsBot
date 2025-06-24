import fs from "fs";
import path from "path";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    ThreadChannel,
    TextChannel,
    ComponentType,
    PermissionsBitField,
    EmbedBuilder,
    ChannelType,
} from "discord.js";

const CONFIG_URL = new URL("../config.json", import.meta.url);

const cfg = JSON.parse(fs.readFileSync(CONFIG_URL, "utf-8")) as {
    scrimThreadChannelId: string;
    adminRoleId: string;
    teamCategoryId: string;
};

// This function creates a thread, sends messages and sets up a button collector.
// Make sure you have SCRIM_THREAD_CHANNEL_ID and ADMIN_ROLE_ID in your environment.
export async function handleScrimAccepted(
    interaction: ChatInputCommandInteraction,
    scrim: {
        id: number;
        date: string;
        time: string;
        team1CaptainId: string;
        team2CaptainId: string;
        team1Name: string;
        team2Name: string;
        numberOfGames: number;
    }
) {
    const channel = interaction.guild?.channels.cache.get(cfg.scrimThreadChannelId) as TextChannel;
    if (!channel) throw new Error("Scrim thread channel not set")

    // Create a private thread so that only added members have access.
    const thread: ThreadChannel = await channel.threads.create({
        name: `Scrim #${scrim.id} | ${scrim.team1Name} vs ${scrim.team2Name}`,
        autoArchiveDuration: 1440,
        type: ChannelType.PrivateThread,
        reason: "Scrim accepted by team captain",
    });

    // Add the two captain users to the private thread.
    await thread.members.add(scrim.team1CaptainId);
    await thread.members.add(scrim.team2CaptainId);

    // Build the embed and add lock button.
    const scrimDateTime = new Date(`${scrim.date}T${scrim.time}:00Z`);
    const unixTime = Math.floor(scrimDateTime.getTime() / 1000);

    const embed = new EmbedBuilder()
        .setTitle(`Match ${scrim.id}`)
        .setDescription(`**${scrim.team1Name}** vs **${scrim.team2Name}**\n\nType of Match: Best of ${scrim.numberOfGames}\nScrim Time: <t:${unixTime}:R>`);

    const lockButton = new ButtonBuilder()
        .setCustomId(`lock_thread_${thread.id}`)
        .setLabel("Lock Thread")
        .setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(lockButton);

    // Send the initial message.
    const adminRoleId = cfg.adminRoleId;
    await thread.send({
        content: `<@&${adminRoleId}>`,
        embeds: [embed],
        components: [row],
    });

    const infoMessage =
        "Hello, <@" + scrim.team1CaptainId + "> and <@" + scrim.team2CaptainId + ">!\n" +
        "Welcome to the scrim. If you need any help dont hesitate to ask in this thread.\n\n" +
        "__**Scrimmage Rules**__\n" +
        "1. **Pre-match check-in:** Captains must be online **10 minutes** before the match to check in with the host and confirm the presence of their players.\n" +
        "2. **Informing unavailability:** If the team cannot make it to the scrim, captains must inform the admins of their unavailability **ahead of time**. Failure to do so may result in additional penalties.\n" +
        "3. **Lateness:** There is a **10-minute grace period** for every scrim. If a team is not ready by then, the scrim will be **forfeited**.\n" +
        "4. Displaying toxicity towards fellow participants and Admins during the event is strictly prohibited.\n" +
        "5. Disruptive behavior will not be tolerated.\n\n" +
        "For now, we may proceed to the coin flip ahead of time. Please let me know which side of the coin you choose (heads or tails). The winner of the coinflip will get to choose if they will ban/pick first.";
    await thread.send({ content: infoMessage });

    // Set up a collector for the lock button (only admins can lock).
    const collector = thread.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
    });

    collector.on("collect", async (i) => {
        if (!i.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await i.reply({ content: "Only admins can lock this thread.", ephemeral: true });
            return;
        }

        await i.deferUpdate();

        const confirmButton = new ButtonBuilder()
            .setCustomId(`confirm_lock_${thread.id}`)
            .setLabel("Confirm Lock")
            .setStyle(ButtonStyle.Danger);
        const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton);

        await i.followUp({
            content: "Are you sure you want to lock the thread?",
            components: [confirmRow],
            ephemeral: true,
        });

        const confirmation = await i.channel?.awaitMessageComponent({
            filter: (ci) => ci.customId === `confirm_lock_${thread.id}` && ci.user.id === i.user.id,
            componentType: ComponentType.Button,
            time: 30000,
        }).catch(() => null);

        if (confirmation) {
            await thread.setLocked(true, "Locked by admin confirmation");
            await confirmation.update({ content: "Thread has been locked.", components: [] });
        } else {
            await i.followUp({ content: "Lock confirmation timed out.", ephemeral: true });
        }
    });
}