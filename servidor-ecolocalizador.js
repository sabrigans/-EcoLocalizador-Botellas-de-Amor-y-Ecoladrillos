const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

// ⚙️ CONFIGURACIÓN
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🖼️ Servir archivos estáticos (para que lea el logo.png desde la raíz)
app.use(express.static(__dirname));

// 🤖 FUNCIÓN DE BÚSQUEDA PROFESIONAL
async function consultarGemini(ciudad) {
  const prompt = `Eres el localizador oficial de la empresa Sharyco. Tu misión es encontrar puntos de acopio de "Botellas de Amor" en ${ciudad}.
  
  REGLAS DE ORO:
  1. Usa la herramienta de búsqueda de Google para encontrar datos ACTUALES.
  2. Si no encuentras una dirección específica, oficial y verificada (municipio o fundación oficial), responde: "No se han encontrado puntos de acopio verificados en esta zona en este momento".
  3. PROHIBIDO INVENTAR: No menciones colegios o clubes si no tienes la certeza de que funcionan como puntos públicos hoy.
  4. Si hay éxito, indica: Nombre del lugar, Dirección exacta y Horarios sugeridos.`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search_retrieval: {} }],
        generationConfig: { 
          temperature: 0.0, // Cero creatividad para evitar datos falsos
          maxOutputTokens: 800 
        }
      },
      { timeout: 15000 }
    );

    const texto = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    return texto || "No se pudo obtener información verificada.";
    
  } catch (error) {
    console.error('Error en búsqueda:', error.message);
    return "El servicio de búsqueda en vivo no está disponible temporalmente. Por favor, consulta los canales oficiales de la Municipalidad.";
  }
}

// --- DISEÑO CSS ---
const estilos = `
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #27ae60; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); width: 100%; max-width: 500px; text-align: center; }
    .logo { max-width: 200px; height: auto; margin-bottom: 25px; }
    h1 { color: #27ae60; font-size: 26px; margin-bottom: 20px; font-weight: 700; }
    input { width: 100%; padding: 15px; border: 2px solid #eee; border-radius: 12px; font-size: 16px; margin-bottom: 20px; box-sizing: border-box; }
    button { background: #27ae60; color: white; border: none; padding: 16px; width: 100%; border-radius: 12px; font-size: 17px; font-weight: bold; cursor: pointer; transition: 0.3s; }
    button:hover { background: #219150; transform: translateY(-2px); }
    .resultado-box { text-align: left; background: #f8f9fa; border-left: 5px solid #27ae60; padding: 20px; border-radius: 12px; margin: 20px 0; white-space: pre-wrap; line-height: 1.6; }
    .legal { font-size: 11px; color: #95a5a6; border-top: 1px solid #eee; padding-top: 15px; margin-top: 20px; font-style: italic; }
    .back-link { display: inline-block; margin-top: 20px; color: #27ae60; text-decoration: none; font-weight: bold; }
  </style>
`;

// --- RUTAS ---

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">${estilos}</head>
    <body>
      <div class="card">
        <img src="/logo.png" alt="Sharyco Logo" class="logo">
        <h1>EcoLocalizador</h1>
        <form method="POST">
          <input type="text" name="ciudad" placeholder="¿Dónde quieres reciclar?" required autofocus>
          <button type="submit">Buscar Puntos de Entrega</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

app.post('/', async (req, res) => {
  const ciudad = req.body.ciudad;
  const respuesta = await consultarGemini(ciudad);
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">${estilos}</head>
    <body>
      <div class="card">
        <img src="/logo.png" alt="Sharyco Logo" class="logo">
        <p>Resultados para: <strong>${ciudad}</strong></p>
        <div class="resultado-box">${respuesta}</div>
        <div class="legal">⚠️ La información proviene de búsquedas automáticas. Sharyco recomienda confirmar con el punto antes de asistir.</div>
        <a href="/" class="back-link">← Realizar otra búsqueda</a>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log('✅ Sharyco listo en puerto ' + PORT);
});
