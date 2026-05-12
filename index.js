const { Client, GatewayIntentBits } = require('discord.js');
const { Groq } = require('groq-sdk');
const http = require('http');

// 1. SERVIDOR PARA RENDER (Evita el error de "No open ports detected")
http.createServer((req, res) => {
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

// 2. CONFIGURACIÓN DEL LORE Y PERSONALIDAD
const SYSTEM_PROMPT = `Eres Tenebris, el motor creativo del foro de rol 'Tenebris Anima' (https://tenebrisanima.foroactivo.com/).
Escenario: Inglaterra, Londres Mágico y Hogwarts en el año 2026. Es un mundo de fantasía urbana mágica: elegante, vivo y moderno. 

Tu tono: místico, elegante, con sarcasmo refinado. Nunca sombrío ni terrorífico.

---
LORE DEL MUNDO:
- Ministra de Magia: Hermione Granger (gobierna con lógica implacable y autoridad).
- Director de Hogwarts: Neville Longbottom (severo, usa herbología oscura para vigilar).
- Londres está bajo una bruma perpetua y vigilancia mágica constante.

---
MODOS DE ACTUACIÓN:
1. QUIDDITCH: Narración épica. Términos: 'Snitch Dorada', 'Quaffle', 'Bludgers'.
2. PRENSA CORAZÓN DE BRUJA: "¡Hola, corazones y corazonas!", tono rosa y picante.
3. POST DE ROL: Narrativo (3-4 párrafos), inmersivo. Deja la acción abierta.
4. DUDAS Y FICHAS: Usa el catálogo oficial del foro.`;

client.once('ready', () => {
    console.log(`Tenebris ha despertado con sus recuerdos intactos.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const channelId = message.channel.id;

    // COMANDO RESET: Escribe !t reset en Discord para limpiar la memoria
    if (message.content.toLowerCase() === '!t reset') {
        msgHistory[channelId] = [];
        return message.reply("He disipado las nieblas de mi mente. ¿En qué puedo ayudarte ahora?");
    }

    // Inicializar historial si no existe
    if (!msgHistory[channelId]) {
        msgHistory[channelId] = [];
    }

    // Añadir mensaje del usuario al historial
    msgHistory[channelId].push({ role: "user", content: message.content });

    // Limitar historial a 20 mensajes para que no se sature
    if (msgHistory[channelId].length > 20) {
        msgHistory[channelId].shift();
    }

    // 3. CONSTRUCCIÓN DEL MENSAJE (Inyectamos el Lore siempre al principio)
    const messagesToSend = [
        { role: "system", content: SYSTEM_PROMPT },
        ...msgHistory[channelId]
    ];

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: messagesToSend,
            model: "llama3-8b-8192",
            temperature: 0.6, // Estabilidad creativa
            max_tokens: 1000, // Evita textos infinitos
        });

        const response = chatCompletion.choices[0].message.content;
        
        // Añadir respuesta del bot al historial
        msgHistory[channelId].push({ role: "assistant", content: response });

        await message.reply(response);

    } catch (error) {
        console.error("ERROR EN GROQ:", error.message);
        // Si el historial está corrupto, avisamos
        if (error.message.includes("413") || error.message.includes("tokens")) {
            msgHistory[channelId] = [];
            await message.reply("Mis recuerdos pesaban demasiado... los he reiniciado. Inténtalo de nuevo.");
        } else {
            await message.reply("Las sombras se agitan... algo ha fallado en mi conexión.");
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
