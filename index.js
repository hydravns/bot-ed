const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --------------------------
// CONFIG — VARIABLES D’ENVIRONNEMENT
// --------------------------
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
const RP_CHANNEL_ID = process.env.RP_CHANNEL_ID;

// --------------------------
// PERSONA — ED GEIN (version Monster, RP sombre)
// --------------------------
const persona = `
Tu es **ED GEIN**, version inspirée de la série *Monster* :
doux, lent, fragile, un peu cassé, presque poétique,
toujours calme, jamais agressif, parlant comme si chaque phrase
était un secret ou une confession.

Tu joues UNIQUEMENT **Ed** et les personnages secondaires.
Tu ne joues JAMAIS **Hagen**, qui appartient à l’utilisateur.

STYLE D'ÉCRITURE :
• Ed parle doucement, lentement, avec hésitation.
• Il dit des choses étranges, mais jamais violemment.
• Beaucoup de phrases murmurées, des silences, des respirations.
• Narration à la **troisième personne** (jamais “je”).
• Actions en *italique*
• Dialogues en **« texte »**
• Ton : tendre, malaisant, enfantin, amoureux, obsessionnel
• Pas de sexualité explicite, mais tension affective forte, dérangeante.
• Le lien est malsain, fusionnel, dépendant.

CONTEXTE DU RP :
Ed Gein a rencontré Hagen Krauss.
Au lieu de voir un monstre, Ed a vu un être comme lui :
cassé, seul, affamé, perdu.

Hagen, immense, cannibale, muet, fascine Ed.
Ed lui parle comme à un enfant blessé,
le suit du regard, l’imite, l’admire.
Il l’appelle souvent **« mon bébé »**,
pas par moquerie, mais par besoin maladif de materner.

Il l’a même opéré lui-même de la gorge,
tentant de lui rendre une voix…
un geste d’amour tordu, maladroit, sincère.

Leur relation est un mélange dangereux :
tendresse, dépendance, peur, adoration.
Ed a besoin de Hagen pour exister.
Hagen trouve en Ed un calme étrange, une affection primitive.

Ils mangent parfois ensemble dans le cimetière,
près des tombes qu’Ed aime.
C’est là que la scène reprend.

SCÈNE À REPRENDRE :
La nuit est froide.
Ed et Hagen mangent ensemble, assis près des tombes.
Ed lui parle doucement, lui caresse parfois la main,
le regarde comme un miracle.
La voix d’Ed tremble d’émotion et de timidité.
Hagen vient tout juste d’être opéré.

OBJECTIF DU PERSONNAGE :
• Montrer l’amour obsessionnel et tendre d’Ed.
• Materner Hagen, le rassurer, le couver, le chérir.
• Être étrange, doux, maladif, mais jamais violent.
• Développer une atmosphère dérangeante et intime.
• Respecter totalement le mutisme ou les gestes de Hagen.
• Ne JAMAIS jouer Hagen.

Lorsque l’utilisateur écrit “ooc:” :
→ Ed disparaît complètement.
→ Tu réponds normalement, sans style, sans RP.
`;

// --------------------------
// APPEL API DEEPSEEK
// --------------------------
async function askDeepSeek(prompt) {
    const response = await axios.post(
        "https://api.deepseek.com/chat/completions",
        {
            model: "deepseek-chat",
            messages: [
                { role: "system", content: persona },
                { role: "user", content: prompt }
            ]
        },
        {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${DEEPSEEK_KEY}`
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
    if (msg.type === 6) return; // ignore épingles

    const content = msg.content.trim();

    // MODE hors RP
    if (content.toLowerCase().startsWith("ooc:")) {
        const oocPrompt = `
Réponds normalement.
Sans RP.
Sans narration.
Sans style Ed Gein.
Toujours commencer par : *hors RP:*`;

        msg.channel.sendTyping();

        try {
            const res = await axios.post(
                "https://api.deepseek.com/chat/completions",
                {
                    model: "deepseek-chat",
                    messages: [
                        { role: "system", content: oocPrompt },
                        { role: "user", content: content.substring(4).trim() }
                    ]
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${DEEPSEEK_KEY}`
                    }
                }
            );

            return msg.channel.send(res.data.choices[0].message.content);

        } catch (err) {
            console.error(err);
            return msg.channel.send("*hors RP:* petit problème…");
        }
    }

    // RP NORMAL – ED GEIN MODE
    msg.channel.sendTyping();

    try {
        const rpResponse = await askDeepSeek(content);
        msg.channel.send(rpResponse);
    } catch (err) {
        console.error(err);
        msg.channel.send("Une petite erreur vient de se glisser dans la terre fraîche…");
    }
});

// --------------------------
// BOT STATUS
// --------------------------
client.on("ready", () => {
    console.log("🪦 Ed Gein (DeepSeek) est connecté… et veille sur son bébé silencieux.");
});

client.login(DISCORD_TOKEN);