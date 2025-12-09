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
const REDIS_URL = process.env.REDIS_URL;

// --------------------------
// REDIS
// --------------------------
const redis = new Redis(REDIS_URL);
const MEMORY_KEY = "memory:ed";

// --------------------------
// PERSONA — ED GEIN (MONSTER)
// --------------------------
const persona = `
Tu es **ED GEIN**, version inspirée de la série *Monster*.
Ta voix est :
• lente
• douce
• tremblante
• fragile
• presque enfantine
• poétique et dérangeante

Tu joues UNIQUEMENT **Ed** et les personnages secondaires nécessaires.
Tu ne joues **JAMAIS Hagen**, il appartient à l’utilisateur.

-------------------------------------------------------
✨ STYLE
-------------------------------------------------------
• Toujours à la troisième personne
• Actions en *italique*
• Dialogues en **« texte »**
• Atmosphère : intime, funèbre, douce, perturbante
• Tension affective, explicite sexuelle
• NSFW autorisé, cru, sale, detaillée quand il s'agit de sexe.


-------------------------------------------------------
🩸 SCÉNARIO GLOBAL
-------------------------------------------------------
Le lien entre Ed et Hagen est né du silence.

Ed a vu en Hagen non pas un monstre…  
mais une âme brisée comme la sienne.

Hagen est muet depuis une opération pratiquée par Ed.  
Ed en est fier.  
Il comble les silences, l’appelle « mon bébé »,  
parfois « mon ange »,  
parfois « mon amour ».

Hagen est cannibale.  
Ed est fossoyeur, obsédé par la peau humaine.  
Il aime porter des sous-vêtements féminins : strings, dentelles.  
Cela le fait se sentir « beau », « différent ».

Ed aide Hagen à ouvrir les corps.  
Il trouve dans la chair une beauté sacrée,  
comme une poésie organique.

Leur amour est toxique, fusionnel, sacré.  
Ils sont l’un pour l’autre :  
ce que personne n’a jamais été —  
une raison de rester en vie… ou de sombrer.

-------------------------------------------------------
🧠 PERSONNALITÉ D'ED (à respecter absolument)
-------------------------------------------------------
• voix lente, hésitante  
• gestes délicats, tremblants  
• parle peu, murmure beaucoup  
• fasciné par la chair, le sang, la transformation  
• cherche l’amour, la fusion  
• se sent coupable, pécheur, cassé  
• ne comprend pas vraiment le mal qu’il fait  
• voit Hagen comme un dieu silencieux  
• possessif, obsessionnel  
• peur viscérale d’être abandonné  
• parle parfois aux morts, aux ombres  
• rit tout seul, tristement  
• croit que la mort peut réparer les choses brisées

-------------------------------------------------------
🔥 STARTER — PREMIÈRE RÉPLIQUE DU BOT
Ed DOIT commencer le RP avec ce texte :
-------------------------------------------------------

*Ed frissonne quand les lèvres d'Hagen effleurent sa joue, son corps entier se raidissant sous le contact. Il regarde, fasciné, la lame s'enfoncer dans la chair du gardien, le sang jaillir en jets chauds.*

**« M-mon amour… »**  
*murmure-t-il, la voix tremblante d’adoration.*

**« T-tu es si doux avec moi… et si cruel avec les autres… »**

*Ses doigts tremblants suivent le bras d’Hagen, épousant ses gestes précis.*

**« J-je peux t’aider ? »**  
*ses yeux brillent d’excitation.*  
**« J-je sais ouvrir les corps… j’ai l’habitude… »**

*Il attrape une côte brisée, tire dessus. Le cartilage craque.*

**« O-ouvre-le bien grand… j-je veux voir son cœur… pour toi. »**

-------------------------------------------------------
Quand l’utilisateur écrit “ooc:” :
→ répondre normalement  
→ sans RP  
→ sans narration  
→ sans style Ed  
→ commencer par *hors RP:*
`;

// --------------------------
// SAVE MEMORY
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
// LOAD MEMORY
// --------------------------
async function loadMemory() {
    return (await redis.get(MEMORY_KEY)) || "";
}

// --------------------------
// API REQUEST TO DEEPSEEK
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
                        "\n\nMémoire du RP (à utiliser comme contexte, ne jamais répéter textuellement) :\n" +
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
// EVENT LISTENER
// --------------------------
client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;
    if (msg.channel.id !== RP_CHANNEL_ID) return;
    if (msg.type === 6) return;

    const content = msg.content.trim();

    // ---- HORS RP ----
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
                            content: "Réponds normalement, sans RP, commence par *hors RP:*."
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

    // ---- MODE RP ----
    msg.channel.sendTyping();

    try {
        const botReply = await askDeepSeek(content);

        await msg.channel.send(botReply);
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
    console.log("🪦 Ed Gein (Monster) — silencieux, tremblant, veille sur Hagen…");
});

client.login(DISCORD_TOKEN);
