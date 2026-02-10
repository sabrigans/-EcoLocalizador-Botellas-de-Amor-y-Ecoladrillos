const express = require('express');
const axios = require('axios');
const app = express();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

async function consultarGemini(ciudad) {
  // Usamos el endpoint v1beta que es el compatible con Google Search Grounding
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const prompt = `Actúa como el EcoLocalizador oficial de Sharyco. 
  Busca puntos de entrega de "Botellas de Amor" en ${ciudad} usando Google Search.
  
  IMPORTANTE: Solo reporta lugares que aparezcan en resultados de búsqueda actuales. 
  Si no encuentras nada oficial o verificado, responde exactamente: "NO_DATOS".
  No inventes ni supongas ubicaciones por conocimiento previo.`;

  try {
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }],
      // Ajustamos el nombre de la herramienta a la versión más estable
      tools: [{ google_search: {} }], 
      generationConfig: { 
        temperature: 0.0, 
        maxOutputTokens: 1000 
      }
    });

    const texto = response.data.candidates[0].content.parts[0].text;

    if (texto.includes("NO_DATOS") || texto.trim().length < 5) {
      return "No se han encontrado puntos de entrega verificados en esta zona a través de la búsqueda en tiempo real.";
    }

    return texto;

  } catch (error) {
    console.error('Detalle técnico:', error.response?.data || error.message);
    return "ERROR DE CONEXIÓN: No se pudo validar la información con Google Search. Por favor, verifica la configuración de Vertex AI o intenta más tarde.";
  }
}

// --- DISEÑO RESTAURADO (EcoLocalizador Sharyco) ---

const head = `
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EcoLocalizador Sharyco</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; margin: 0; padding: 20px; }
        .card { background: white; padding: 45px; border-radius: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); width: 100%; max-width: 550px; text-align: center; }
        .logo { width: 120px; margin-bottom: 20px; }
        h1 { color: #27ae60; font-size: 34px; margin-bottom: 12px; font-weight: 700; }
        .descripcion { color: #7f8c8d; font-size: 16px; line-height: 1.6; margin-bottom: 35px; }
        input { width: 100%; padding: 16px; border: 2px solid #e0e0e0; border-radius: 12px; font-size: 16px; margin-bottom: 20px; }
        button { width: 100%; background: #27ae60; color: white; padding: 16px; border: none; border-radius: 12px; font-size: 17px; font-weight: 700; cursor: pointer; transition: 0.3s; }
        button:hover { background: #219150; }
        .res-container { text-align: left; background: #f9fafb; padding: 25px; border-radius: 15px; border: 2px solid #e8f5e9; color: #2c3e50; margin: 20px 0; }
        .res-text { white-space: pre-wrap; line-height: 1.8; font-size: 15px; }
        .info-box { background: #fff3cd; border-left: 5px solid #ffc107; padding: 18px; border-radius: 10px; margin-top: 20px; font-size: 14px; color: #856404; text-align: left; }
    </style>
</head>`;

app.get('/', (req, res) => {
  res.send(`<html>${head}<body><div class="card">
    <img src="/logo.png" class="logo" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3299/3299935.png'">
    <h1>EcoLocalizador Sharyco</h1>
    <p class="descripcion">Encuentra puntos de entrega para <strong>Botellas de Amor</strong> y <strong>Ecoladrillos</strong></p>
    <form method="POST">
      <input type="text" name="ciudad" placeholder="Ej: Vicente Lopez, Buenos Aires" required autofocus>
      <button type="submit">🔍 Buscar Puntos de Entrega</button>
    </form>
  </div></body></html>`);
});

app.post('/', async (req, res) => {
  const ciudad = req.body.ciudad;
  const respuesta = await consultarGemini(ciudad);
  res.send(`<html>${head}<body><div class="card" style="max-width: 800px;">
    <img src="/logo.png" class="logo" style="width: 60px;">
    <h1>EcoLocalizador Sharyco</h1>
    <div style="background: #e8f5e9; padding: 15px; border-radius: 12px; margin-bottom: 20px; border-left: 5px solid #27ae60; text-align: left;">
        📍 <strong>Búsqueda para:</strong> ${ciudad}
    </div>
    <div class="res-container"><div class="res-text">${respuesta}</div></div>
    <div class="info-box">
        <strong>💡 ¿Conoces un punto que no aparece aquí?</strong> Repórtalo a Sharyco para agregarlo a la base de datos y ayudar a más personas.
    </div>
    <br><a href="/" style="color: #27ae60; font-weight: bold; text-decoration: none;">← Nueva Búsqueda</a>
  </div></body></html>`);
});

app.listen(PORT);
