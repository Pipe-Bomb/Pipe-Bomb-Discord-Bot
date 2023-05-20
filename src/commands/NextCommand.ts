import { SlashCommandBuilder } from "discord.js";
import Command from "./Command.js";
import InteractionWrapper from "../InteractionWrapper.js";
import { PlayingTrackEmbed } from "../EmbedTemplates.js";

export default class NextCommand extends Command {
    getCommand() {
        return new SlashCommandBuilder()
        .setName("next")
        .setDescription("Skip to next track in queue");
    }

    matchesButton(buttonID: string) {
        return false;
    }

    getCommandNames() {
        return "next";
    }

    async run(i: InteractionWrapper) {
        const channel = i.getSenderVoiceChannel();
        const voice = this.bot.getVoice(channel.guildId);
        voice.activeCheck();

        const next = await voice.nextTrack();
        if (next) {
            i.reply(await PlayingTrackEmbed(this.bot, next));
        } else {
            i.reply({
                title: "You've reached the end of the queue",
                description: "Add more tracks to keep listening"
            });
        }
    }
}