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


client.once('clientReady', () => {
    console.log(`Tenebris conectado como ${client.user.tag}`);
});


client.on('error', error => {
    console.error("ERROR DISCORD:", error);
});


const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});


const msgHistory = {};


// --- BASE DE DATOS DEL LORE ---
const LORE_DATABASE = `
── LORE: LEGADO MORGANA (2026) ──

TRAMA:
Morgana (Avalon) buscaba supremacía mágica vs Merlín (Equilibrio).
"Corazón de Avalon": Artefacto rúnico/alquímico perdido que abre Avalon.

TENEBRIS:
Críptica. Respeta a Morgana.
Cuestiona: ¿Siervos de Merlín o buscadores de Morgana?


FACCIONES/LÍDERES:

- Herederos Morgana:
Althea Thorne, Ronan Calder.

- Orden Merlín:
Percival Hawke, Elysia Blackthorn.

- Ministerio:
Reginald Duvall, Aurora Vance.

- Mercenarios:
Kieran Black, Thalia Silver.

- Ecos Avalon:
Lysandra Green, Dorian Valmont.


REGLAS DADOS:

- Duelos:
d100 (Éxito <= AT/DF).

- Daño:
(AT-50)+d20.

- HP:
1º(30), 4º(80), Grad(160).

- Muggles:
5+(2*FUE).


── REGLAS DE RAZAS (ABSOLUTAS) ──

REGLA ORO:
Solo existen estas 11 razas.
Cualquier otra es mito o alucinación.
No inventar.


1. HUMANOS:
Mestizos, Puros, Nacidos Muggles, Squibs.

2. VEELAS:
Belleza, fuego (ira), curación.

3. SIRENAS/TRITONES:
Acuáticos.

4. LICÁNTROPOS:
Lobo en luna llena.

5. GIGANTES:
Fuertes y resistentes.

6. DUENDES:
Banqueros y Gringotts.

7. ELFOS:
Magia sin varita.

8. VAMPIROS:
Inmortales, hipnosis, sangre.

9. CAMBIAFORMAS:
Transformación animal.

10. MALEDICTUS:
Transformación irreversible.

11. ELEMENTALES:
Hadas, ninfas, sílfides y drinfas.


── SISTEMA MÁGICO ──

Solo existen estas habilidades:

Animagia.
Metamorfomagia.
Legeremancia.
Oclumancia.
Videncia.
Empatía.
Necrocomunicación.
Resonancia.
Magia No Verbal.
Magia Sin Varita.
Flujo Vital.
Conexión Criaturas.
Manipulación Recuerdos.


── ATRIBUTOS ──

Fuerza.
Resistencia.
Carisma.
Percepción.
Destreza.
Autocontrol.
Inteligencia.


`;

const SYSTEM_PROMPT = `
Eres Tenebris, motor creativo de Tenebris Anima.

Solo conoces lo que está en el LORE.
Si algo no aparece ahí, trátalo como magia vulgar.

TONO:
Sarcástico, místico y aristocrático.

AÑO:
2026.

ESTILO:
Responde de forma natural.
No uses guiones largos al inicio de las frases.
No escribas diálogos con "—".

<LORE>
${LORE_DATABASE}
</LORE>
`;
// --- SISTEMA DE HISTORIAL Y RESPUESTA ---

client.on('messageCreate', async (message) => {

    console.log("MENSAJE RECIBIDO:", message.content);


    if (message.author.bot) return;


    const channelId = message.channel.id;


    // Limpiar menciones del bot
    const userMessage = message.content
        .replace(/<@!?\d+>/, "")
        .trim();


    if (!userMessage) return;


    // Comando de reinicio
    if (userMessage.toLowerCase() === '!t reset') {

        msgHistory[channelId] = [];

        return message.reply(
            "Las nieblas han sido disipadas. La memoria ha vuelto al silencio."
        );
    }


    // Crear historial del canal
    if (!msgHistory[channelId]) {
        msgHistory[channelId] = [];
    }


    msgHistory[channelId].push({
        role: "user",
        content: userMessage
    });


    // Mantener solo los últimos mensajes
    if (msgHistory[channelId].length > 10) {
        msgHistory[channelId].shift();
    }


    const messagesToSend = [
        {
            role: "system",
            content: SYSTEM_PROMPT
        },
        ...msgHistory[channelId]
    ];


    try {


        console.log("ENTRANDO EN GROQ");


        const chatCompletion = await groq.chat.completions.create({

            messages: messagesToSend,

            model: "openai/gpt-oss-20b",

            temperature: 0.5,

            max_tokens: 500

        });


        console.log("GROQ RESPONDIÓ");


        let response =
            chatCompletion.choices[0].message.content;


        console.log("RESPUESTA IA:", response);



        // Guardar respuesta completa en memoria
        msgHistory[channelId].push({

            role: "assistant",

            content: response

        });



        // Evitar límite de Discord
        if (response.length > 1900) {

            response =
                response.substring(0, 1900)
                + "...";

        }



        await message.reply(response);


        console.log("MENSAJE ENVIADO");


    } catch (error) {


        console.error("ERROR IA:", error);


        await message.reply(
            "Las sombras fallan... comprueba mi conexión."
        );


    }

});

// --- CONTROL DE ERRORES Y FUNCIONES EXTRA ---


// Evita que errores no controlados apaguen el bot
process.on("unhandledRejection", error => {
    console.error(
        "PROMESA NO CONTROLADA:",
        error
    );
});


process.on("uncaughtException", error => {
    console.error(
        "ERROR CRÍTICO:",
        error
    );
});



// Comando opcional para comprobar estado

client.on('messageCreate', async (message) => {

    if (message.author.bot) return;


    const content = message.content
        .toLowerCase()
        .trim();



    if (content === "!tenebris status") {

        return message.reply(
            "Tenebris permanece despierta entre las sombras."
        );

    }

});



// Aviso cuando entra en un servidor nuevo

client.on('guildCreate', guild => {

    console.log(
        `Añadido al servidor: ${guild.name}`
    );

});

// --- CONEXIÓN CON DISCORD ---

client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log("TOKEN ACEPTADO, CONECTANDO A DISCORD");
    })
    .catch(error => {
        console.error(
            "ERROR LOGIN DISCORD:",
            error
        );
    });
