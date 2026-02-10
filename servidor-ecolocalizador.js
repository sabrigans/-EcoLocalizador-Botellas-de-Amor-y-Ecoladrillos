const express = require('express');
const axios = require('axios');
const app = express();

// ⚙️ CONFIGURACIÓN
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;

// 🖼️ TU LOGO DE DRIVE YA CONVERTIDO
const URL_DE_MI_LOGO = "https://lh3.googleusercontent.com/u/0/d/19MllKJjmET1V5lkvLML3g426PmMBWhye";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🤖 FUNCIÓN DE BÚSQUEDA (USA GOOGLE SEARCH)
async function consultarGemini(ciudad) {
  const prompt = `Actúa como el EcoLocalizador oficial de Sharyco. Tu objetivo es encontrar puntos de recepción de "Botellas de Amor" o "Ecoladrillos" en la ciudad de: ${ciudad}.
  
  INSTRUCCIONES:
  1. Usa Google Search para encontrar direcciones reales y actualizadas.
  2. Proporciona nombre del lugar, dirección exacta y horarios si están disponibles.
  3. Si no encuentras puntos específicos, menciona la oficina de Medio Ambiente o el Punto Verde municipal más cercano.
  
  Responde con un listado claro, profesional y amigable.`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search_retrieval: {} }],
        generationConfig: { temperature: 0.1 }
      }
    );
    return response.data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error('Error en búsqueda:', error.message);
    return "Lo sentimos, no pudimos completar la búsqueda. Por favor, intenta de nuevo.";
  }
}

// --- RUTAS ---

app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EcoLocalizador Sharyco</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
      .container { background: white; border-radius: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); max-width: 450px; width: 100%; padding: 40px; text-align: center; }
      .logo-img { width: 150px; margin-bottom: 20px; border-radius: 10px; }
      h1 { color: #27ae60; font-size: 28px; margin-bottom: 10px; font-weight: 800; }
      p { color: #7f8c8d; margin-bottom: 30px; line-height: 1.5; }
      input { width: 100%; padding: 15px; border: 2px solid #eee; border-radius: 12px; font-size: 16px; margin-bottom: 20px; transition: 0.3s; }
      input:focus { border-color: #27ae60; outline: none; box-shadow: 0 0 0 4px rgba(46, 204, 113, 0.1); }
      button { width: 100%; background: #27ae60; color: white; border: none; padding: 16px; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; transition: 0.3s; }
      button:hover { background: #219150; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
    </style>
  </head>
  <body>
    <div class="container">
      <img src="${URL_DE_MI_LOGO}" alt="Sharyco Logo" class="logo-img">
      <h1>EcoLocalizador</h1>
      <p>Encuentra dónde entregar tus Botellas de Amor en cualquier parte del mundo.</p>
      <form method="POST">
        <input type="text" name="ciudad" placeholder="Ej: Vicente Lopez, Buenos Aires" required autofocus>
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
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resultados - Sharyco</title>
    <style>
      body { font-family: 'Segoe UI', sans-serif; background: #f0f4f3; padding: 20px; color: #2c3e50; }
      .container { max-width: 700px; margin: 40px auto; background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
      .header { border-bottom: 2px solid #f0f0f0; margin-bottom: 25px; padding-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
      .logo-small { height: 50px; }
      .ciudad-box { background: #e8f5e9; padding: 15px; border-radius: 12px; border-left: 5px solid #27ae60; margin-bottom: 25px; }
      .resultado-text { white-space: pre-wrap; line-height: 1.8; font-size: 16px; }
      .disclaimer { margin-top: 30px; padding: 20px; background: #fff8e1; border-radius: 12px; border: 1px solid #ffe082; color: #856404; font-size: 13px; font-style: italic; }
      .btn-back { display: inline-block; margin-top: 25px; color: #27ae60; text-decoration: none; font-weight: bold; padding: 10px 20px; border: 2px solid #27ae60; border-radius: 10px; transition: 0.3s; }
      .btn-back:hover { background: #27ae60; color: white; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>Resultados</h2>
        <img src="${URL_DE_MI_LOGO}" alt="Sharyco Logo" class="logo-small">
      </div>
      <div class="ciudad-box">
        📍 <strong>Búsqueda para:</strong> ${ciudad}
      </div>
      <div class="resultado-text">${respuesta || "No se encontraron resultados específicos."}</div>
      
      <div class="disclaimer">
        <strong>⚠️ AVISO LEGAL:</strong> Esta información es generada automáticamente en tiempo real por IA mediante búsquedas públicas. Sharyco no gestiona estos puntos. Recomendamos verificar con la entidad local o municipalidad antes de concurrir.
      </div>
      
      <center><a href="/" class="btn-back">← Nueva búsqueda</a></center>
    </div>
  </body>
  </html>`);
});

app.listen(PORT, () => console.log(`🚀 Sharyco activo en puerto ${PORT}`));
