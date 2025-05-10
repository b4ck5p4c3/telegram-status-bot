import {Telegraf} from "telegraf";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({
    path: ".env.local"
});

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "1337008:B4CKSP4CEB4CKSP4CEB4CKSP4CEB4CKSP4C";
const TELEGRAM_API_ROOT = process.env.TELEGRAM_API_ROOT ?? "https://api.telegram.org";
const TELEGRAM_WEBHOOK_PORT = parseInt(process.env.TELEGRAM_WEBHOOK_PORT ?? "8080")
const TELEGRAM_WEBHOOK_DOMAIN = process.env.TELEGRAM_WEBHOOK_DOMAIN ?? "localhost";
const STATUS_SERVICE_URL = process.env.STATUS_SERVICE_URL ?? "";
const ONLINE_SERVICE_URL = process.env.ONLINE_SERVICE_URL ?? "";
const SWYNCA_URL = process.env.SWYNCA_URL ?? "https://swynca.bksp.in";
const SWYNCA_API_KEY = process.env.SWYNCA_API_KEY ?? "";

const bot = new Telegraf(TELEGRAM_BOT_TOKEN, {
    telegram: {
        apiRoot: TELEGRAM_API_ROOT
    }
});

interface StatusResponse {
    spacePower: "on" | "off" | "unknown"
}

type OnlineResponse = string[];

async function getSpaceStatus(): Promise<StatusResponse> {
    return await (await fetch(`${STATUS_SERVICE_URL}/status`)).json();
}

async function getOnline(): Promise<OnlineResponse> {
    return await (await fetch(`${ONLINE_SERVICE_URL}/online`)).json();
}

type MembersResponse = {
    id: string;
    username: string;
    telegramMetadata?: {
        telegramId: string,
        telegramName?: string
    }
}[];

async function getMembers(): Promise<MembersResponse> {
    return await (await fetch(`${SWYNCA_URL}/api/members`, {
        headers: {
            authorization: `Bearer ${SWYNCA_API_KEY}`
        }
    })).json();
}

bot.command("status", async (ctx) => {
    const members = await getMembers();

    const telegramUserId = ctx.message.chat.id;
    if (!members.find(member => parseInt(member.telegramMetadata?.telegramId ?? "0")
        === telegramUserId)) {
        return;
    }

    const spaceStatus = await getSpaceStatus();
    const online = await getOnline();

    let message = "";
    switch (spaceStatus.spacePower) {
        case "on":
            message += "🟢 Space is *ON*\n";
            break;
        case "off":
            message += "🔴 Space is *OFF*\n";
            break;
        case "unknown":
            message += "🟡 Space is *UNKNOWN* _(wut?)_\n";
            break;
    }

    message += "\n";
    switch (online.length) {
        case 0:
            message += `*No one is online at the space*`;
            break;
        case 1:
            message += `*Someone is online at the space:*\n`;
            break;
        default:
            message += `*${online.length} ppl online @ the space:*\n`;
            break;
    }

    for (const memberId of online) {
        const member = members.find(member => member.id === memberId);
        if (!member) {
            message += `${memberId}\n`;
            continue;
        }
        message += member.telegramMetadata?.telegramName ?
            `[${member.username}](https://t.me/${member.telegramMetadata.telegramName})` : member.username;
        message += "\n";
    }

    await ctx.sendMessage(message, {
        parse_mode: "MarkdownV2",
        link_preview_options: {
            is_disabled: true
        }
    });
});

bot.launch(TELEGRAM_WEBHOOK_DOMAIN ? {
    webhook: {
        domain: TELEGRAM_WEBHOOK_DOMAIN,
        port: TELEGRAM_WEBHOOK_PORT,
        path: "/"
    }
} : {}).catch(e => {
    console.error(e);
});

process.once("SIGINT", () => bot.stop("SIGINT"))
process.once("SIGTERM", () => bot.stop("SIGTERM"))
