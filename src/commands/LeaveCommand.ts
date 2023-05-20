import { SlashCommandBuilder } from "discord.js";
import Command from "./Command.js";
import InteractionWrapper from "../InteractionWrapper.js";

export default class LeaveCommand extends Command {
    getCommand() {
        return new SlashCommandBuilder()
        .setName("leave")
        .setDescription("Disconnect immediately");
    }

    matchesButton(buttonID: string) {
        return false;
    }

    getCommandNames() {
        return "leave";
    }

    async run(i: InteractionWrapper) {
        const channel = i.getSenderVoiceChannel();
        const voice = this.bot.getVoice(channel.guildId);
        voice.activeCheck();

        voice.destroy();
        i.reply({
            title: "Disconnected"
        }); 
    }
}