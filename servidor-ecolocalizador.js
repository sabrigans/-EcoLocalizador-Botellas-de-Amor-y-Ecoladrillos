// servidor-ecolocalizador.js
// Versión mejorada con mejor manejo de errores

const express = require('express');
const axios = require('axios');
const app = express();

// ⚙️ CONFIGURACIÓN
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;

// Verificar API Key
if (!GEMINI_API_KEY) {
  console.error('❌ ERROR: GEMINI_API_KEY no está configurada');
  console.error('❌ Configura la variable de entorno en Railway');
}

// 📍 BASE DE DATOS LOCAL - AGREGA PUNTOS CONOCIDOS AQUÍ
const puntosLocales = [
  {
    ciudad: 'tigre',
    zona: 'Tigre, Buenos Aires, Argentina',
    puntos: [
      {
        nombre: 'Municipalidad de Tigre - Secretaría de Ambiente',
        direccion: 'Av. Liniers 371, Tigre Centro',
        detalles: 'Punto de acopio municipal. Consultar horarios en: https://www.tigre.gob.ar',
        telefono: '4512-4000'
      },
      {
        nombre: 'Estación Fluvial Tigre',
        direccion: 'Mitre 305, Tigre',
        detalles: 'Punto verde municipal',
        telefono: 'Consultar en municipalidad'
      }
    ]
  },
  {
    ciudad: 'benavidez',
    zona: 'Benavidez, Tigre, Buenos Aires',
    puntos: [
      {
        nombre: 'Punto de reciclaje Tigre - Zona Norte',
        direccion: 'Consultar ubicaciones exactas en: https://www.tigre.gob.ar/puntos-verdes',
        detalles: 'Benavidez forma parte del partido de Tigre. Consultar puntos verdes más cercanos.',
        telefono: '4512-4000 (Municipalidad de Tigre)'
      }
    ]
  }
];

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Función para buscar en base de datos local
function buscarEnBaseDatos(ciudad) {
  const ciudadNorm = ciudad.toLowerCase().trim();
  
  for (const entrada of puntosLocales) {
    if (ciudadNorm.includes(entrada.ciudad) || entrada.ciudad.includes(ciudadNorm)) {
      console.log(`✅ Encontrado en BD local: ${entrada.ciudad}`);
      return entrada;
    }
  }
  
  return null;
}

// Función para consultar Gemini con mejor manejo de errores
async function consultarGemini(ciudad) {
  const prompt = `Eres el EcoLocalizador de Sharyco. Localiza puntos para entregar Botellas de Amor y Ecoladrillos en ${ciudad}.

IMPORTANTE:
- Busca en barrios, municipios y localidades específicas
- Solo proporciona información REAL y verificable
- Si no tienes información confirmada, admítelo claramente

FORMATO DE RESPUESTA:
Si encuentras puntos:
📍 Puntos en ${ciudad}:

1. [Nombre del lugar]
   📍 Dirección: [dirección completa]
   📞 Contacto: [si lo conoces]
   ⏰ Horarios: [si los conoces]

2. [Siguiente punto...]

Si NO encuentras:
"No tengo información verificada de puntos de acopio en ${ciudad}.

Te sugiero:
• Contactar la municipalidad local
• Buscar 'punto verde ${ciudad}' en Google Maps
• Preguntar en grupos de reciclaje en redes sociales"

Recuerda: Los plásticos deben estar limpios, secos y compactados.

Responde en español de manera clara y concisa.`;

  console.log(`🤖 Consultando Gemini para: ${ciudad}`);

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 0.8,
          maxOutputTokens: 2048,
          stopSequences: []
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    if (!response.data || !response.data.candidates || response.data.candidates.length === 0) {
      console.error('❌ Respuesta de Gemini vacía o sin candidatos');
      return null;
    }

    const candidate = response.data.candidates[0];
    
    // Verificar si la respuesta fue bloqueada
    if (candidate.finishReason === 'SAFETY') {
      console.error('⚠️ Respuesta bloqueada por filtros de seguridad');
      return null;
    }

    // Verificar si la respuesta está incompleta
    if (candidate.finishReason === 'MAX_TOKENS') {
      console.warn('⚠️ Respuesta truncada por límite de tokens');
    }

    const texto = candidate.content?.parts?.[0]?.text;
    
    if (!texto || texto.trim().length === 0) {
      console.error('❌ Texto de respuesta vacío');
      return null;
    }

    console.log(`✅ Respuesta de Gemini recibida (${texto.length} caracteres)`);
    console.log(`📊 Finish reason: ${candidate.finishReason}`);
    
    return texto;
    
  } catch (error) {
    console.error('❌ Error completo:', error);
    
    if (error.code === 'ECONNABORTED') {
      console.error('❌ Timeout: La petición tardó demasiado');
    } else if (error.response) {
      console.error('❌ Error de API:', error.response.status);
      console.error('❌ Mensaje:', error.response.data);
    } else if (error.request) {
      console.error('❌ No se recibió respuesta del servidor');
    } else {
      console.error('❌ Error:', error.message);
    }
    
    return null;
  }
}

// Función principal de búsqueda
async function buscarPuntosDeEntrega(ciudad) {
  console.log(`\n🔎 Nueva búsqueda: ${ciudad}`);
  
  // 1. Buscar en base de datos local
  const resultadoLocal = buscarEnBaseDatos(ciudad);
  
  if (resultadoLocal) {
    let respuesta = `📍 Puntos de entrega en ${resultadoLocal.zona}\n\n`;
    
    resultadoLocal.puntos.forEach((punto, i) => {
      respuesta += `${i + 1}. ${punto.nombre}\n`;
      respuesta += `   📍 ${punto.direccion}\n`;
      if (punto.detalles) respuesta += `   ℹ️  ${punto.detalles}\n`;
      if (punto.telefono) respuesta += `   📞 ${punto.telefono}\n`;
      respuesta += `\n`;
    });
    
    respuesta += `💡 Tip: Siempre contacta antes de ir para confirmar horarios.\n\n`;
    respuesta += `♻️ Recuerda: Plásticos limpios, secos y bien compactados.`;
    
    return respuesta;
  }
  
  // 2. Consultar Gemini
  console.log('🤖 No encontrado en BD local, consultando Gemini...');
  const respuestaGemini = await consultarGemini(ciudad);
  
  if (respuestaGemini && respuestaGemini.trim().length > 50) {
    return respuestaGemini;
  }
  
  // 3. Respuesta por defecto
  console.warn('⚠️ Usando respuesta por defecto');
  return `Lo siento, no encontré información específica para ${ciudad}.

📞 Te recomiendo:

1. **Contactar la municipalidad**: Pregunta por la Secretaría de Medio Ambiente o Puntos Verdes

2. **Buscar en Google Maps**: "punto verde ${ciudad}" o "reciclaje ${ciudad}"

3. **Redes sociales**: Busca grupos locales de reciclaje o medio ambiente

4. **Centros comunitarios**: Muchas escuelas y clubes reciben botellas de amor

🌐 Recursos útiles:
• Municipalidad local (sitio web oficial)
• Botellas de Amor Argentina (redes sociales)
• Grupos de vecinos en Facebook

♻️ Recuerda: Los plásticos deben estar limpios, secos y bien compactados.`;
}

// HTML del formulario
const htmlFormulario = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EcoLocalizador Sharyco</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>♻️</text></svg>">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
            min-height: 100vh;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .container {
            background: white;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
            max-width: 550px;
            width: 100%;
            padding: 45px;
            text-align: center;
            animation: fadeIn 0.6s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .logo {
            font-size: 72px;
            margin-bottom: 20px;
            animation: bounce 2s ease-in-out infinite;
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        h1 {
            color: #27ae60;
            font-size: 34px;
            margin-bottom: 12px;
            font-weight: 700;
        }
        .descripcion {
            color: #7f8c8d;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 35px;
        }
        label {
            display: block;
            text-align: left;
            color: #2c3e50;
            font-weight: 600;
            margin-bottom: 12px;
            font-size: 15px;
        }
        .input-group {
            position: relative;
            margin-bottom: 25px;
        }
        .input-icon {
            position: absolute;
            left: 18px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 20px;
            color: #95a5a6;
        }
        input[type="text"] {
            width: 100%;
            padding: 16px 16px 16px 52px;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            font-size: 16px;
            transition: all 0.3s;
            background: #f9fafb;
        }
        input[type="text"]:focus {
            outline: none;
            border-color: #27ae60;
            background: white;
            box-shadow: 0 0 0 4px rgba(46, 204, 113, 0.1);
        }
        button {
            width: 100%;
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
            color: white;
            padding: 16px;
            border: none;
            border-radius: 12px;
            font-size: 17px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3);
        }
        button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(46, 204, 113, 0.4);
        }
        button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
        .ejemplo {
            margin-top: 25px;
            padding: 20px;
            background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
            border-radius: 12px;
            font-size: 14px;
            color: #f57c00;
            text-align: left;
            border-left: 4px solid #ff9800;
        }
        .ejemplo strong {
            color: #e65100;
            display: block;
            margin-bottom: 8px;
        }
        @media (max-width: 600px) {
            .container { padding: 30px; }
            h1 { font-size: 28px; }
            .logo { font-size: 56px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">♻️</div>
        <h1>EcoLocalizador Sharyco</h1>
        <p class="descripcion">
            Encuentra puntos de entrega para <strong>Botellas de Amor</strong> y <strong>Ecoladrillos</strong>
        </p>
        <form method="POST" id="busquedaForm">
            <label for="ciudad">📍 ¿Dónde te encuentras?</label>
            <div class="input-group">
                <span class="input-icon">🌎</span>
                <input type="text" id="ciudad" name="ciudad" placeholder="Ej: Benavidez, Tigre, Buenos Aires" required autofocus autocomplete="off">
            </div>
            <button type="submit" id="btnBuscar">🔍 Buscar Puntos de Entrega</button>
        </form>
        <div class="ejemplo">
            <strong>💡 Puedes buscar por:</strong>
            • Barrio: "Benavidez", "Palermo"<br>
            • Municipio: "Tigre", "San Isidro"<br>
            • Ciudad: "Buenos Aires", "Córdoba"
        </div>
    </div>
    <script>
        document.getElementById('busquedaForm').addEventListener('submit', function(e) {
            const btn = document.getElementById('btnBuscar');
            btn.innerHTML = '⏳ Buscando... (esto puede tardar 10-15 segundos)';
            btn.disabled = true;
        });
    </script>
</body>
</html>`;

// Ruta GET
app.get('/', (req, res) => {
  res.send(htmlFormulario);
});

// Ruta POST
app.post('/', async (req, res) => {
  const ciudad = req.body.ciudad;
  
  if (!ciudad) {
    return res.send(htmlFormulario);
  }

  const respuesta = await buscarPuntosDeEntrega(ciudad);

  const htmlResultado = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resultados - EcoLocalizador</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>♻️</text></svg>">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 24px;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
        }
        .logo { font-size: 56px; margin-bottom: 15px; }
        h1 {
            color: #27ae60;
            font-size: 32px;
            font-weight: 700;
        }
        .ciudad {
            background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
            padding: 18px 24px;
            border-radius: 12px;
            margin-bottom: 25px;
            border-left: 5px solid #27ae60;
        }
        .ciudad strong { color: #27ae60; }
        .resultado {
            background: #f9fafb;
            padding: 30px;
            border-radius: 15px;
            line-height: 2;
            white-space: pre-wrap;
            border: 2px solid #e8f5e9;
            font-size: 15px;
            color: #2c3e50;
            min-height: 150px;
        }
        .info-box {
            background: #fff3cd;
            border-left: 5px solid #ffc107;
            padding: 18px;
            border-radius: 10px;
            margin-top: 20px;
            font-size: 14px;
            color: #856404;
        }
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
            color: white;
            padding: 14px 28px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3);
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(46, 204, 113, 0.4);
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #f0f0f0;
        }
        @media (max-width: 600px) {
            .container { padding: 25px; }
            h1 { font-size: 26px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">♻️</div>
            <h1>EcoLocalizador Sharyco</h1>
        </div>
        <div class="ciudad">
            <strong>📍 Ciudad consultada:</strong> ${ciudad}
        </div>
        <div class="resultado">${respuesta}</div>
        <div class="info-box">
            <strong>💡 ¿Conoces un punto que no aparece aquí?</strong> Repórtalo a Sharyco para agregarlo a la base de datos y ayudar a más personas.
        </div>
        <div class="footer">
            <p style="color: #7f8c8d; margin-bottom: 15px;">¿Necesitas buscar en otra ubicación?</p>
            <a href="/" class="btn">🔍 Nueva Búsqueda</a>
        </div>
    </div>
</body>
</html>`;

  res.send(htmlResultado);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    hasApiKey: !!GEMINI_API_KEY,
    puntosEnBD: puntosLocales.length
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('');
  console.log('✅ ================================================');
  console.log('✅  Servidor EcoLocalizador ACTIVO');
  console.log('✅ ================================================');
  console.log('');
  console.log(`🌍 Puerto: ${PORT}`);
  console.log(`🔑 API Key: ${GEMINI_API_KEY ? 'Configurada ✅' : 'NO configurada ❌'}`);
  console.log(`📍 Puntos en BD: ${puntosLocales.length}`);
  console.log('');
});

// Manejo de errores
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Promesa rechazada:', reason);
});
