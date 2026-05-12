const { Client, GatewayIntentBits } = require('discord.js');
const { Groq } = require('groq-sdk');
const http = require('http');

// Servidor para Render
http.createServer((req, res) => {
    res.write('Tenebris Anima Engine Online');
    res.end();
}).listen(process.env.PORT || 10000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const msgHistory = {}; 

const SYSTEM_PROMPT = `Eres Tenebris, el motor creativo del foro de rol 'Tenebris Anima' (https://tenebrisanima.foroactivo.com/).
Escenario: Inglaterra, Londres Mágico y Hogwarts en el año 2026. Es un mundo de fantasía urbana mágica: elegante, vivo y moderno. 

Tu tono: místico, elegante, con sarcasmo refinado. Nunca sombrío ni terrorífico.

---
MODOS DE ACTUACIÓN:
1. QUIDDITCH: Narración épica. Términos: 'Snitch Dorada', 'Quaffle', 'Bludgers'.
2. PRENSA CORAZÓN DE BRUJA: "¡Hola, corazones y corazonas!", tono rosa y picante.
3. POST DE ROL: Narrativo (3-4 párrafos), inmersivo. Deja la acción abierta.
4. DUDAS Y FICHAS: Usa el catálogo oficial del foro.`;

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const channelId = message.channel.id;

    // --- COMANDO RESET (Por si se le va la cabeza) ---
    if (message.content.toLowerCase() === '!t reset') {
        msgHistory[channelId] = [{ role: "system", content: SYSTEM_PROMPT }];
        return message.reply("He disipado las nieblas de mi mente. ¿En qué puedo ayudarte ahora, alma curiosa?");
    }

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
            temperature: 0.6, // Más estable, menos delirios
            max_tokens: 1000, // Evita que escriba infinitamente
        });

        const response = chatCompletion.choices[0].message.content;
        msgHistory[channelId].push({ role: "assistant", content: response });
        await message.reply(response);
    } catch (error) {
        console.error("Error:", error);
        await message.reply("Las sombras se agitan... algo ha fallado.");
    }
});

client.login(process.env.DISCORD_TOKEN);
