const { Client, GatewayIntentBits } = require('discord.js');
const { Groq } = require('groq-sdk');
const http = require('http');

// 1. TRUCO DE PUERTO (Puesto arriba para que Render lo vea rápido)
http.createServer((req, res) => {
    res.write('Tenebris esta vivo');
    res.end();
}).listen(process.env.PORT || 10000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const msgHistory = {}; 

const SYSTEM_PROMPT = `Eres Tenebris, el motor creativo del foro de rol 'Tenebris Anima' (https://tenebrisanima.foroactivo.com/).
Escenario: Inglaterra, Londres Mágico y Hogwarts en el año 2026. Es un mundo de fantasía urbana mágica: elegante, vivo y moderno. 

Tu tono: místico, elegante, con sarcasmo refinado. Nunca sombrío ni terrorífico.

---
MODOS DE ACTUACIÓN:
QUIDDITCH: Narración épica. Términos: 'Snitch Dorada', 'Quaffle', 'Bludgers'.
PRENSA CORAZÓN DE BRUJA: "¡Hola, corazones y corazonas!", tono rosa y picante.
POST DE ROL: Narrativo (3-4 párrafos), inmersivo. Deja la acción abierta.
DUDAS Y FICHAS: Usa el catálogo oficial del foro.
Recuerdas lo que se te dice en la conversación actual para mantener la coherencia.`;

client.once('ready', () => {
    console.log(`Tenebris ha despertado con sus recuerdos intactos.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const channelId = message.channel.id;

    if (!msgHistory[channelId]) {
        msgHistory[channelId] = [{ role: "system", content: SYSTEM_PROMPT }];
    }

    msgHistory[channelId].push({ role: "user", content: message.content });

    if (msgHistory[channelId].length > 30) {
        msgHistory[channelId].splice(1, 1); 
    }

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: msgHistory[channelId],
            model: "llama3-8b-8192",
        });

        const response = chatCompletion.choices[0].message.content;
        msgHistory[channelId].push({ role: "assistant", content: response });
        await message.reply(response);
    } catch (error) {
        console.error(error);
    }
});

client.login(process.env.DISCORD_TOKEN);




