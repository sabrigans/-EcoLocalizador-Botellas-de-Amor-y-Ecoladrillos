const express = require('express');
const axios = require('axios');
const app = express();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

async function consultarGemini(ciudad) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const prompt = `Actúa como el localizador oficial de Sharyco. 
  Busca puntos de acopio de "Botellas de Amor" en la ciudad de ${ciudad} usando Google Search.
  
  REGLA ESTRICTA: 
  Si no encuentras resultados oficiales y actuales de este año, responde EXACTAMENTE: "ERROR_NO_DATOS".
  No utilices conocimiento previo ni supongas ubicaciones. Solo reporta lo que encuentres en la búsqueda en vivo.`;

  try {
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }], // Herramienta que habilitaste en Cloud
      generationConfig: { 
        temperature: 0.0, // Bloquea la creatividad de la IA
        maxOutputTokens: 800 
      }
    });

    const texto = response.data.candidates[0].content.parts[0].text;

    // Si la IA responde nuestro código secreto o algo vacío, disparamos el error
    if (texto.includes("ERROR_NO_DATOS") || texto.trim().length < 5) {
      return "ERROR: No se han encontrado puntos de acopio verificados en esta zona mediante la búsqueda oficial.";
    }

    return texto;

  } catch (error) {
    // Si la búsqueda de Google falla por permisos o conexión, mostramos error directo
    console.error('Detalle del error:', error.response?.data || error.message);
    return "ERROR DE CONEXIÓN: El servicio de búsqueda en tiempo real no pudo validar la información. Por favor, intente más tarde.";
  }
}

// --- HTML (Mantiene el diseño de Sharyco que ya te gustó) ---

const head = `
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EcoLocalizador Sharyco</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #27ae60; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
        .card { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); width: 100%; max-width: 550px; text-align: center; }
        .logo { width: 120px; margin-bottom: 20px; }
        h1 { color: #27ae60; font-size: 34px; margin-bottom: 12px; font-weight: 700; }
        .descripcion { color: #7f8c8d; font-size: 16px; margin-bottom: 35px; }
        input { width: 100%; padding: 16px; border: 2px solid #e0e0e0; border-radius: 12px; font-size: 16px; margin-bottom: 20px; }
        button { width: 100%; background: #27ae60; color: white; padding: 16px; border: none; border-radius: 12px; font-size: 17px; font-weight: 700; cursor: pointer; }
        .res { text-align: left; background: #f9fafb; padding: 25px; border-radius: 15px; line-height: 1.8; white-space: pre-wrap; border: 2px solid #e8f5e9; color: #2c3e50; }
        .legal { font-size: 12px; color: #7f8c8d; border-top: 1px solid #eee; padding-top: 15px; margin-top: 20px; font-style: italic; }
    </style>
</head>`;

app.get('/', (req, res) => {
  res.send(`<html>${head}<body><div class="card">
    <img src="/logo.png" class="logo" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3299/3299935.png'">
    <h1>EcoLocalizador Sharyco</h1>
    <p class="descripcion">Buscador oficial de puntos de entrega verificados.</p>
    <form method="POST"><input type="text" name="ciudad" placeholder="Ej: Vicente Lopez" required><button type="submit">Buscar Puntos</button></form>
  </div></body></html>`);
});

app.post('/', async (req, res) => {
  const ciudad = req.body.ciudad;
  const respuesta = await consultarGemini(ciudad);
  res.send(`<html>${head}<body><div class="card">
    <img src="/logo.png" class="logo" style="width: 60px;">
    <h3>Resultados para ${ciudad}</h3>
    <div class="res">${respuesta}</div>
    <div class="legal">⚠️ Información obtenida exclusivamente mediante búsqueda en tiempo real.</div>
    <br><a href="/" style="color: #27ae60; font-weight: bold; text-decoration: none;">← Volver</a>
  </div></body></html>`);
});

app.listen(PORT);
