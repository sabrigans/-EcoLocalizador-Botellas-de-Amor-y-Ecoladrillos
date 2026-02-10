const express = require('express');
const axios = require('axios');
const app = express();

// ⚙️ CONFIGURACIÓN
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;

// 🖼️ URL DE LOGO CORREGIDA (Link Directo de Drive)
const URL_DE_MI_LOGO = "http://googleusercontent.com/profile/picture/4";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🤖 FUNCIÓN DE BÚSQUEDA PROFESIONAL
async function consultarGemini(ciudad) {
  // El prompt ahora es ultra estricto para evitar inventos
  const prompt = `Eres el localizador oficial de Sharyco. Tu tarea es encontrar puntos reales para "Botellas de Amor" en ${ciudad}.
  
  REGLAS CRÍTICAS:
  1. Usa la herramienta de búsqueda de Google.
  2. Si NO encuentras una dirección específica y confirmada, responde exactamente: "No he podido localizar puntos de acopio verificados en esta ubicación actualmente."
  3. No menciones lugares basados en suposiciones.
  4. Si encuentras información, incluye: Nombre, Dirección exacta y Horario (si existe).`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search_retrieval: {} }], // Herramienta de búsqueda en vivo
        generationConfig: { 
          temperature: 0.0, // Bajamos a 0 para eliminar CUALQUIER rastro de "creatividad" o invento
          maxOutputTokens: 1000 
        }
      },
      { timeout: 15000 } // Si tarda más de 15 seg, da error
    );

    const texto = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!texto || texto.length < 5) {
      return "No se encontró información verificada para esta ciudad.";
    }

    return texto;
  } catch (error) {
    console.error('Error en API:', error.message);
    // Si la herramienta de Google Search falla (por falta de créditos o error técnico), 
    // devolvemos este mensaje en lugar de dejar que la IA invente datos viejos.
    return "Lo sentimos, el servicio de búsqueda en tiempo real no está disponible o no encontró datos precisos. Por favor, intenta de nuevo más tarde o consulta la web municipal.";
  }
}

// --- RUTAS ---

app.get('/', (req, res) => {
  res.send(htmlFormulario());
});

app.post('/', async (req, res) => {
  const ciudad = req.body.ciudad;
  const respuesta = await consultarGemini(ciudad);
  res.send(htmlResultado(ciudad, respuesta));
});

app.listen(PORT, () => console.log(`🚀 Sharyco funcionando en puerto ${PORT}`));

// --- DISEÑO ---

function htmlFormulario() {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EcoLocalizador Sharyco</title>
    <style>
      body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #2ecc71, #27ae60); min-height: 100vh; display: flex; justify-content: center; align-items: center; margin: 0; }
      .container { background: white; border-radius: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); width: 90%; max-width: 450px; padding: 40px; text-align: center; }
      .logo { width: 160px; margin-bottom: 20px; }
      h1 { color: #27ae60; margin-bottom: 20px; }
      input { width: 100%; padding: 15px; border: 2px solid #eee; border-radius: 12px; margin-bottom: 20px; font-size: 16px; }
      button { width: 100%; background: #27ae60; color: white; border: none; padding: 16px; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 16px; }
    </style>
  </head>
  <body>
    <div class="container">
      <img src="${URL_DE_MI_LOGO}" class="logo" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3299/3299935.png'">
      <h1>EcoLocalizador</h1>
      <form method="POST">
        <input type="text" name="ciudad" placeholder="Ingresa tu ciudad..." required autofocus>
        <button type="submit">Buscar Puntos Verdes</button>
      </form>
    </div>
  </body>
  </html>`;
}

function htmlResultado(ciudad, respuesta) {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resultados - Sharyco</title>
    <style>
      body { font-family: 'Segoe UI', sans-serif; background: #f4f7f6; padding: 20px; }
      .container { max-width: 650px; margin: 0 auto; background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 20px; margin-bottom: 20px; }
      .logo-small { height: 45px; }
      .res-box { white-space: pre-wrap; line-height: 1.7; color: #333; font-size: 16px; background: #f9f9f9; padding: 20px; border-radius: 15px; }
      .disclaimer { margin-top: 20px; padding: 15px; background: #fff3cd; color: #856404; border-radius: 10px; font-size: 13px; font-style: italic; }
      .btn { display: block; text-align: center; margin-top: 30px; color: #27ae60; text-decoration: none; font-weight: bold; border: 2px solid #27ae60; padding: 10px; border-radius: 10px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2 style="color:#27ae60">Resultados</h2>
        <img src="${URL_DE_MI_LOGO}" class="logo-small" onerror="this.style.display='none'">
      </div>
      <p style="margin-bottom:15px">📍 Búsqueda en: <strong>${ciudad}</strong></p>
      <div class="res-box">${respuesta}</div>
      <div class="disclaimer">
        <strong>⚠️ IMPORTANTE:</strong> Información obtenida en tiempo real. Sharyco no se responsabiliza por cambios de horarios o cierres de puntos de terceros.
      </div>
      <a href="/" class="btn">← Nueva Búsqueda</a>
    </div>
  </body>
  </html>`;
}
