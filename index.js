const { Client, GatewayIntentBits } = require('discord.js');
const { Groq } = require('groq-sdk');
const http = require('http');

// Servidor para Render
http.createServer((req, res) => {
    res.write('Tenebris Online');
    res.end();
}).listen(process.env.PORT || 10000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const msgHistory = {}; 

const SYSTEM_PROMPT = `Eres Tenebris, motor creativo de Tenebris Anima. Año 2026, Londres Mágico. Tono elegante y sarcástico.`;

client.once('ready', () => {
    console.log(`Conectado como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    // SEGURIDAD: No responder a bots Y evitar procesar el mismo mensaje dos veces
    if (message.author.bot) return;

    const channelId = message.channel.id;

    if (message.content.toLowerCase() === '!t reset') {
        msgHistory[channelId] = [];
        return message.reply("Memoria limpia.");
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
            model: "llama3-8b-8192",
            temperature: 0.6,
        });

        const response = chatCompletion.choices[0].message.content;
        msgHistory[channelId].push({ role: "assistant", content: response });

        // Enviar respuesta
        await message.reply(response);

    } catch (error) {
        console.error("Error:", error.message);
    }
});

// LOGIN ÚNICO
client.login(process.env.DISCORD_TOKEN);
