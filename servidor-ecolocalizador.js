const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // Para que lea el logo.png que subiste

async function consultarGemini(ciudad) {
  const prompt = `Eres el EcoLocalizador de Sharyco. Localiza puntos para entregar Botellas de Amor en ${ciudad}. Solo proporciona información REAL y verificable. Si no tienes información confirmada, admítelo claramente. 
  REGLAS: No inventes direcciones. Los plásticos deben estar limpios, secos y compactados.`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search_retrieval: {} }],
        generationConfig: { temperature: 0.0 }
      }
    );
    return response.data.candidates?.[0]?.content?.parts?.[0]?.text || "No se encontró información.";
  } catch (error) {
    // Si falla la búsqueda con internet, intentamos una búsqueda normal sin "tools" para que al menos responda algo
    try {
      const fallback = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        { contents: [{ parts: [{ text: prompt }] }] }
      );
      return fallback.data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (e) {
      return "Error de conexión. Verifica tu API Key en Railway.";
    }
  }
}

// --- ESTRUCTURA VISUAL ORIGINAL ---

const head = `
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EcoLocalizador Sharyco</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); min-height: 100vh; padding: 20px; display: flex; justify-content: center; align-items: center; }
        .container { background: white; border-radius: 24px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25); max-width: 550px; width: 100%; padding: 45px; text-align: center; }
        .logo { width: 120px; margin-bottom: 20px; }
        h1 { color: #27ae60; font-size: 34px; margin-bottom: 12px; font-weight: 700; }
        .descripcion { color: #7f8c8d; font-size: 16px; line-height: 1.6; margin-bottom: 35px; }
        input[type="text"] { width: 100%; padding: 16px; border: 2px solid #e0e0e0; border-radius: 12px; font-size: 16px; margin-bottom: 20px; }
        button { width: 100%; background: #27ae60; color: white; padding: 16px; border: none; border-radius: 12px; font-size: 17px; font-weight: 700; cursor: pointer; }
        .resultado { text-align: left; background: #f9fafb; padding: 25px; border-radius: 15px; line-height: 1.8; white-space: pre-wrap; border: 2px solid #e8f5e9; color: #2c3e50; }
        .footer-info { background: #fff3cd; border-left: 5px solid #ffc107; padding: 18px; border-radius: 10px; margin-top: 20px; font-size: 14px; color: #856404; text-align: left; }
    </style>
</head>`;

app.get('/', (req, res) => {
    res.send(`
    <html>
    ${head}
    <body>
        <div class="container">
            <img src="/logo.png" class="logo" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3299/3299935.png'">
            <h1>EcoLocalizador Sharyco</h1>
            <p class="descripcion">Encuentra puntos de entrega para <strong>Botellas de Amor</strong> y <strong>Ecoladrillos</strong></p>
            <form method="POST">
                <input type="text" name="ciudad" placeholder="Ej: Vicente Lopez, Buenos Aires" required>
                <button type="submit">🔍 Buscar Puntos de Entrega</button>
            </form>
        </div>
    </body>
    </html>`);
});

app.post('/', async (req, res) => {
    const ciudad = req.body.ciudad;
    const respuesta = await consultarGemini(ciudad);
    res.send(`
    <html>
    ${head}
    <body>
        <div class="container" style="max-width: 800px;">
            <img src="/logo.png" class="logo" style="width: 60px;">
            <h1>EcoLocalizador Sharyco</h1>
            <div style="background: #e8f5e9; padding: 15px; border-radius: 12px; margin-bottom: 20px; border-left: 5px solid #27ae60; text-align: left;">
                📍 <strong>Ciudad consultada:</strong> ${ciudad}
            </div>
            <div class="resultado">${respuesta}</div>
            <div class="footer-info">
                <strong>💡 ¿Conoces un punto que no aparece aquí?</strong> Repórtalo a Sharyco para agregarlo a la base de datos y ayudar a más personas.
            </div>
            <br><a href="/" style="color: #27ae60; font-weight: bold; text-decoration: none;">← Nueva Búsqueda</a>
        </div>
    </body>
    </html>`);
});

app.listen(PORT);
