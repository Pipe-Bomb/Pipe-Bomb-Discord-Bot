import { SlashCommandBuilder } from "discord.js";
import Command from "./Command.js";
import InteractionWrapper from "../InteractionWrapper.js";
import { formatTime } from "../Utils.js";

export default class StatusCommand extends Command {
    getCommand() {
        return new SlashCommandBuilder()
        .setName("status")
        .setDescription("List details regarding Pipe Bomb");
    }

    matchesButton(buttonID: string) {
        return false;
    }

    getCommandNames() {
        return "status";
    }

    async run(i: InteractionWrapper) {
        i.reply({
            title: "Pipe Bomb Bot Status",
            fields: [{
                name: "Uptime",
                value: formatTime(this.bot.getUptime())
            }, {
                name: "Discord latency",
                value: this.bot.client.ws.ping + "ms"
            }]
        });
    }
}