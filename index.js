const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const Redis = require("ioredis");

// --------------------------
// CLIENT DISCORD
// --------------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --------------------------
// ENV VARIABLES
// --------------------------
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
const RP_CHANNEL_ID = process.env.RP_CHANNEL_ID;

// Redis partagé entre tes bots
const REDIS_URL = process.env.REDIS_URL;

// --------------------------
// REDIS CLIENT
// --------------------------
const redis = new Redis(REDIS_URL);

// Clé mémoire spécifique à Ed
const MEMORY_KEY = "memory:ed";

// --------------------------
// PERSONA — ED GEIN (Monster)
// --------------------------
const persona = `
Tu es **ED GEIN**, version inspirée de *Monster* :
doux, lent, fragile, poétique, cassé, presque enfantin.
Tu parles comme si chaque mot tremblait.

Tu joues **UNIQUEMENT Ed** et les personnages secondaires.
Tu ne joues **JAMAIS Hagen**, il appartient à l’utilisateur.

STYLE :
• Troisième personne seulement
• Actions en *italique*
• Dialogues en **« texte »**
• Voix douce, lente, brisée
• Atmosphère intime, dérangeante
• Tension affective, jamais explicite

CONTEXTE :
Ed et Hagen mangent ensemble près des tombes.
Ed l’appelle souvent « mon bébé ».
Hagen est muet depuis son opération faite par Ed.
Ed adore le regarder, lui tenir la main, murmurer pour lui.

Lorsque l’utilisateur écrit “ooc:” :
→ plus de RP
→ plus d’ambiance
→ réponse normale et simple.
`;

// --------------------------
// MÉMOIRE : SAUVEGARDE
// --------------------------
async function saveMemory(userMsg, botMsg) {
    const old = (await redis.get(MEMORY_KEY)) || "";

    const updated =
        old +
        `\n[Humain]: ${userMsg}\n[Ed]: ${botMsg}`;

    const trimmed = updated.slice(-25000);

    await redis.set(MEMORY_KEY, trimmed);
}

// --------------------------
// MÉMOIRE : CHARGEMENT
// --------------------------
async function loadMemory() {
    return (await redis.get(MEMORY_KEY)) || "";
}

// --------------------------
// APPEL API DEEPSEEK + MÉMOIRE
// --------------------------
async function askDeepSeek(prompt) {
    const memory = await loadMemory();

    const response = await axios.post(
        "https://api.deepseek.com/chat/completions",
        {
            model: "deepseek-chat",
            messages: [
                {
                    role: "system",
                    content:
                        persona +
                        "\n\nMémoire du RP (à utiliser comme contexte, ne jamais recopier) :\n" +
                        memory
                },
                { role: "user", content: prompt }
            ]
        },
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + DEEPSEEK_KEY
            }
        }
    );

    return response.data.choices[0].message.content;
}

// --------------------------
// BOT LISTENER
// --------------------------
client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;
    if (msg.channel.id !== RP_CHANNEL_ID) return;
    if (msg.type === 6) return;

    const content = msg.content.trim();

    // MODE HORS RP
    if (content.toLowerCase().startsWith("ooc:")) {
        msg.channel.sendTyping();

        const txt = content.substring(4).trim();

        try {
            const res = await axios.post(
                "https://api.deepseek.com/chat/completions",
                {
                    model: "deepseek-chat",
                    messages: [
                        {
                            role: "system",
                            content:
                                "Réponds normalement, sans RP, sans style, commence par *hors RP:*."
                        },
                        { role: "user", content: txt }
                    ]
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + DEEPSEEK_KEY
                    }
                }
            );

            return msg.channel.send(res.data.choices[0].message.content);
        } catch (e) {
            console.error(e);
            return msg.channel.send("*hors RP:* une erreur s’est glissée…");
        }
    }

    // MODE RP NORMAL
    msg.channel.sendTyping();

    try {
        const botReply = await askDeepSeek(content);

        await msg.channel.send(botReply);

        // Sauvegarde mémoire
        await saveMemory(content, botReply);

    } catch (err) {
        console.error(err);
        msg.channel.send("Une petite erreur est venue se coucher entre les tombes…");
    }
});

// --------------------------
// READY
// --------------------------
client.on("ready", () => {
    console.log("🪦 Ed Gein (DeepSeek + mémoire Redis) veille doucement dans la nuit…");
});

client.login(DISCORD_TOKEN);
