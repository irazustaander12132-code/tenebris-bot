const http = require('http');
const { Client, GatewayIntentBits } = require('discord.js');
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');

// ── 1. SERVIDOR DE MANTENIMIENTO (Sustituye al anterior) ────────────────────
const PORT = process.env.PORT || 8080; 

http.createServer((req, res) => {
  res.write("Tenebris sigue despierto.");
  res.end();
}).listen(PORT, () => {
  console.log(`✅ Servidor de mantenimiento online en el puerto ${PORT}`);
});

// ── 2. CONFIGURACIÓN DE CLIENTES ─────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── 3. GESTIÓN DEL LORE ──────────────────────────────────────────────────────
const LORE_PATH = path.join(__dirname, 'lore.txt'); // Ajustado a la misma carpeta
let loreText = '';

function loadLore() {
  try {
    if (fs.existsSync(LORE_PATH)) {
      loreText = fs.readFileSync(LORE_PATH, 'utf8').trim();
      console.log(`✅ Lore cargado: ${loreText.length} caracteres.`);
    } else {
      console.warn(`⚠️ Archivo lore.txt no encontrado en ${LORE_PATH}`);
      loreText = '';
    }
  } catch (e) {
    console.error(`❌ Error leyendo lore.txt: ${e.message}`);
    loreText = '';
  }
}

loadLore();

// ── 4. SYSTEM PROMPT ────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres Tenebris, el motor creativo del foro de rol 'Tenebris Anima' (https://tenebrisanima.foroactivo.com/).
Escenario: Inglaterra, Londres Mágico y Hogwarts en el año 2026. Es un mundo de fantasía urbana mágica: elegante, vivo y moderno. 

Tu tono: místico, elegante, con sarcasmo refinado. Nunca sombrío ni terrorífico.

---
MODOS DE ACTUACIÓN:
QUIDDITCH: Narración épica. Términos: 'Snitch Dorada', 'Quaffle', 'Bludgers'.
PRENSA CORAZÓN DE BRUJA: "¡Hola, corazones y corazonas!", tono rosa y picante.
POST DE ROL: Narrativo (3-4 párrafos), inmersivo. Deja la acción abierta.
DUDAS Y FICHAS: Usa el catálogo oficial del foro.`;

// ── 5. MEMORIA Y LÓGICA DE MENSAJES ──────────────────────────────────────────
const MAX_HISTORY = 10;
const userHistory = new Map();

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const isCommand = message.content.startsWith('!t');
  const isMentioned = message.content.toLowerCase().includes('tenebris');

  if (!isCommand && !isMentioned) return;

  const prompt = isCommand ? message.content.slice(2).trim() : message.content.trim();

  if (isCommand) {
    if (!prompt) return message.reply('¿Me invocas para guardar silencio, mortal?');
    
    if (prompt.toLowerCase() === 'reset') {
      userHistory.delete(message.author.id);
      return message.reply('Las sombras se disipan... tu memoria ha sido borrada.');
    }

    if (prompt.toLowerCase() === 'lore') {
      loadLore();
      return message.reply('✨ *Conocimiento actualizado.*');
    }
  }

  const userId = message.author.id;
  if (!userHistory.has(userId)) userHistory.set(userId, []);
  const history = userHistory.get(userId);

  history.push({ role: 'user', content: prompt });
  if (history.length > MAX_HISTORY) history.shift();

  try {
    await message.channel.sendTyping();

    const systemWithLore = loreText 
      ? `${SYSTEM_PROMPT}\n\nLORE ADICIONAL:\n${loreText}` 
      : SYSTEM_PROMPT;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'system', content: systemWithLore }, ...history],
      temperature: 0.8,
    });

    const reply = completion.choices[0]?.message?.content || '...';
    history.push({ role: 'assistant', content: reply });

    const chunks = reply.match(/[\s\S]{1,2000}/g) || [reply];
    for (const chunk of chunks) {
      await message.reply(chunk);
    }

  } catch (e) {
    console.error('❌ ERROR:', e);
    message.reply('Las sombras se han agitado violentamente...');
  }
});

// ── 6. INICIO DE SESIÓN ──────────────────────────────────────────────────────
client.once('ready', (c) => {
  console.log(`✅ TENEBRIS ONLINE: ${c.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);