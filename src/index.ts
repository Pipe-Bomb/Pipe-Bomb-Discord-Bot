import Bot from "./Bot.js";
import JoinCommand from "./commands/JoinCommand.js";
import LeaveCommand from "./commands/LeaveCommand.js";
import NextCommand from "./commands/NextCommand.js";
import PlayNowCommand from "./commands/PlayNowCommand.js";
import QueueCommand from "./commands/QueueCommand.js";
import StatusCommand from "./commands/StatusCommand.js";

const bot = new Bot();

new StatusCommand(bot);
new JoinCommand(bot);
new PlayNowCommand(bot);
new NextCommand(bot);
new QueueCommand(bot);
new LeaveCommand(bot);

bot.updateCommands();