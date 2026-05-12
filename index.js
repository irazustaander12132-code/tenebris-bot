const { Client, GatewayIntentBits } = require('discord.js');
const { Groq } = require('groq-sdk');
const http = require('http');

// Servidor para Render
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('Tenebris Anima Engine Online');
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
DUDAS Y FICHAS: Usa el catálogo oficial del foro.`;

client.once('ready', () => {
    console.log(`Tenebris ha despertado con el modelo Llama 3.1`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const channelId = message.channel.id;

    if (message.content.toLowerCase() === '!t reset') {
        msgHistory[channelId] = [];
        return message.reply("Nieblas despejadas. ¿Qué deseas saber ahora?");
    }

    if (!msgHistory[channelId]) msgHistory[channelId] = [];
    msgHistory[channelId].push({ role: "user", content: message.content });

    if (msgHistory[channelId].length > 15) msgHistory[channelId].shift();

    const messagesToSend = [
        { role: "system", content: SYSTEM_PROMPT },
        ...msgHistory[channelId]
    ];

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: messagesToSend,
            model: "llama-3.1-8b-instant", // <--- EL MODELO NUEVO AQUÍ
            temperature: 0.6,
            max_tokens: 1000,
        });

        const response = chatCompletion.choices[0].message.content;
        msgHistory[channelId].push({ role: "assistant", content: response });
        await message.reply(response);

    } catch (error) {
        console.error("ERROR EN GROQ:", error.message);
        await message.reply("Las sombras se agitan... algo ha fallado en la conexión.");
    }
});

client.login(process.env.DISCORD_TOKEN);
