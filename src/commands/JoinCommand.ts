import { SlashCommandBuilder } from "discord.js";
import Command from "./Command.js";
import InteractionWrapper from "../InteractionWrapper.js";

export default class JoinCommand extends Command {
    getCommand() {
        return new SlashCommandBuilder()
        .setName("join")
        .setDescription("Join your voice channel");
    }

    matchesButton(buttonID: string) {
        return false;
    }

    getCommandNames() {
        return "join";
    }

    async run(i: InteractionWrapper) {
        const channel = i.getSenderVoiceChannel();

        const voice = this.bot.getVoice(channel.guildId);
        voice.joinVC(channel.id);

        i.reply({
            title: "Joined voice channel!"
        });
    }
}