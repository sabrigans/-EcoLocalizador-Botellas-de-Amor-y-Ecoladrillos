const express = require('express');
const axios = require('axios');
const app = express();

// ⚙️ CONFIGURACIÓN
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;

if (!GEMINI_API_KEY) {
  console.error('❌ ERROR: GEMINI_API_KEY no está configurada en las variables de entorno');
}

// 📍 BASE DE DATOS LOCAL (Costo $0 - Respuestas instantáneas)
const puntosLocales = [
  {
    ciudad: 'tigre',
    zona: 'Tigre, Buenos Aires, Argentina',
    puntos: [
      {
        nombre: 'Municipalidad de Tigre - Secretaría de Ambiente',
        direccion: 'Av. Liniers 371, Tigre Centro',
        detalles: 'Punto de acopio municipal.',
        telefono: '4512-4000'
      }
    ]
  },
  {
    ciudad: 'vicente lopez',
    zona: 'Vicente López, Buenos Aires',
    puntos: [
      {
        nombre: 'Club CAOSA (Olivos)',
        direccion: 'Ricardo Gutiérrez 1345',
        detalles: 'Martes a sábados de 11:00 a 20:00'
      },
      {
        nombre: 'Fundación Regenerar (Munro)',
        direccion: 'José Ingenieros 4911',
        detalles: 'Lun. a Vie. 08:00 a 17:00 / Sáb. 08:00 a 13:00'
      },
      {
        nombre: 'Plaza Toto González (Florida)',
        direccion: 'Urquiza 2440',
        detalles: 'Punto verde en plaza pública.'
      }
    ]
  }
];

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Lógica de búsqueda
function buscarEnBaseDatos(ciudad) {
  const ciudadNorm = ciudad.toLowerCase().trim();
  for (const entrada of puntosLocales) {
    if (ciudadNorm.includes(entrada.ciudad) || entrada.ciudad.includes(ciudadNorm)) {
      return entrada;
    }
  }
  return null;
}

async function consultarGemini(ciudad) {
  const prompt = `Eres el experto de Sharyco en reciclaje mundial. Localiza puntos reales y actuales para entregar "Botellas de Amor" (o ecoladrillos/plastic bricks) en ${ciudad}.
  
  REGLAS:
  1. Usa Google Search para verificar lugares abiertos HOY.
  2. Si no encuentras puntos específicos, menciona la entidad de reciclaje oficial de esa ciudad.
  3. No inventes direcciones.
  
  Formato:
  📍 Puntos en ${ciudad}:
  1. [Nombre] - [Dirección] - [Horario]`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search_retrieval: {} }], // 🌐 Búsqueda en tiempo real
        generationConfig: { temperature: 0.1 }   // 🎯 Alta precisión
      }
    );
    return response.data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error('Error API:', error.message);
    return null;
  }
}

async function buscarPuntosDeEntrega(ciudad) {
  const local = buscarEnBaseDatos(ciudad);
  if (local) {
    let res = `📍 Puntos de entrega en ${local.zona}\n\n`;
    local.puntos.forEach((p, i) => res += `${i+1}. ${p.nombre}\n   📍 ${p.direccion}\n   ℹ️ ${p.detalles}\n\n`);
    return res;
  }
  return await consultarGemini(ciudad) || "No pudimos localizar puntos en este momento.";
}

// --- RUTAS ---

app.get('/', (req, res) => {
  res.send(htmlFormulario()); // Función que retorna el HTML de búsqueda
});

app.post('/', async (req, res) => {
  const ciudad = req.body.ciudad;
  const respuesta = await buscarPuntosDeEntrega(ciudad);
  res.send(htmlResultado(ciudad, respuesta)); // Función con el Aviso Legal
});

app.listen(PORT, () => console.log(`🚀 Sharyco corriendo en puerto ${PORT}`));

// --- COMPONENTES HTML (Con Aviso Legal) ---

function htmlFormulario() {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8"><title>EcoLocalizador Sharyco</title>
    <style>
      body { font-family: sans-serif; background: #2ecc71; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
      .card { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); width: 90%; max-width: 400px; text-align: center; }
      input { width: 100%; padding: 12px; margin: 20px 0; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; }
      button { background: #27ae60; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; width: 100%; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>♻️ Sharyco</h1>
      <p>Busca puntos para tus Botellas de Amor</p>
      <form method="POST">
        <input type="text" name="ciudad" placeholder="Ej: Vicente Lopez, Madrid, etc." required>
        <button type="submit">Buscar Puntos</button>
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
    <meta charset="UTF-8"><title>Resultados - Sharyco</title>
    <style>
      body { font-family: sans-serif; background: #f4f7f6; padding: 20px; color: #333; }
      .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
      .res { white-space: pre-wrap; line-height: 1.6; background: #f9f9f9; padding: 20px; border-radius: 10px; margin: 20px 0; }
      .disclaimer { font-size: 12px; color: #7f8c8d; border-top: 1px solid #eee; pt: 15px; margin-top: 20px; font-style: italic; }
      .btn { display: inline-block; background: #27ae60; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>📍 Resultados para: ${ciudad}</h2>
      <div class="res">${respuesta}</div>
      
      <div class="disclaimer">
        <strong>⚠️ AVISO LEGAL:</strong> La información mostrada es obtenida de forma automática a través de inteligencia artificial y registros públicos. Sharyco no garantiza la disponibilidad actual de los contenedores. Recomendamos contactar directamente al lugar o a la municipalidad antes de trasladarse.
      </div>
      
      <br><a href="/" class="btn">🔙 Nueva búsqueda</a>
    </div>
  </body>
  </html>`;
}
