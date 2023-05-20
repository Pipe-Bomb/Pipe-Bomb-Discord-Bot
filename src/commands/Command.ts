import { SlashCommandBuilder } from "discord.js"
import Bot from "../Bot.js"
import InteractionWrapper from "../InteractionWrapper.js";

export default abstract class Command {
    constructor(protected readonly bot: Bot) {
        bot.registerCommand(this);
    }

    abstract getCommand(): SlashCommandBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;

    abstract matchesButton(buttonID: string): boolean;

    abstract getCommandNames(): string | string[];

    abstract run(i: InteractionWrapper): Promise<void>;
}