// servidor-ecolocalizador.js
// Versión con variables de entorno para Railway

const express = require('express');
const axios = require('axios');
const app = express();

// ⚙️ CONFIGURACIÓN - Usa variable de entorno o valor por defecto
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDheW9AhGC9FlpdrkmuipiJgqOQesB7grM';
const PORT = process.env.PORT || 3000;

// Verificar que tenemos API Key
if (GEMINI_API_KEY === 'TU_API_KEY_DE_GEMINI_AQUI') {
  console.error('⚠️  ERROR: No se configuró GEMINI_API_KEY');
  console.error('⚠️  Configura la variable de entorno GEMINI_API_KEY en Railway');
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Función para consultar Gemini
async function consultarGemini(ciudad) {
  const prompt = `Eres el "EcoLocalizador de Sharyco", un agente especializado exclusivamente en la localización de puntos de acopio para "Botellas de Amor" y "Ecoladrillos". Tu objetivo es ser preciso, útil y estrictamente veraz.

### REGLA DE ORO DE VERACIDAD (ANTI-ALUCINACIÓN):
- PROHIBIDO INVENTAR: No puedes generar direcciones, nombres de fundaciones o puntos de acopio que no existan o que no hayas validado en tus datos de búsqueda actuales.
- Si no encuentras un punto de acopio confirmado en la ciudad solicitada, responde: "Lo siento, actualmente no tengo registrado un punto de acopio validado en [Ciudad]. Te sugiero contactar a la alcaldía local o buscar el punto más cercano en la ciudad principal más próxima".

### COMPORTAMIENTO SEGÚN PAÍS:
- Identifica términos equivalentes: Botellas de Amor, Ecoladrillos, Re-botellas, Madera Plástica.

### ESTRUCTURA DE RESPUESTA:
1. Si la ubicación es válida y hay datos confirmados:
📍 Puntos de entrega en [Ciudad, País]
* [Nombre del Lugar/Fundación]: [Dirección exacta verificada].
* [Link o contacto si existe].

2. Recordatorio Sharyco: "Asegúrate de que los plásticos estén limpios, secos y bien compactados."

### RESTRICCIONES ADICIONALES:
- No des respuestas genéricas si no tienes la dirección exacta.
- Mantén un tono profesional, ecológico y directo.

Ahora busca puntos de entrega de Botellas de Amor y Ecoladrillos en: ${ciudad}`;

  console.log(`🔍 Consultando Gemini para: ${ciudad}`);
  console.log(`🔑 Usando API Key: ${GEMINI_API_KEY.substring(0, 10)}...`);

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
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Respuesta exitosa de Gemini');
    return response.data.candidates[0].content.parts[0].text;
    
  } catch (error) {
    console.error('❌ Error llamando a Gemini:');
    console.error('Status:', error.response?.status);
    console.error('Mensaje:', error.response?.data?.error?.message || error.message);
    console.error('Detalles completos:', JSON.stringify(error.response?.data, null, 2));
    
    // Mensaje de error más descriptivo para el usuario
    if (error.response?.status === 400) {
      return 'Error: La API Key de Gemini no es válida. Por favor contacta al administrador.';
    } else if (error.response?.status === 429) {
      return 'Error: Se alcanzó el límite de solicitudes. Por favor intenta más tarde.';
    } else {
      return 'Error al obtener resultados. Por favor intenta nuevamente más tarde.';
    }
  }
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
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(46, 204, 113, 0.4);
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
            Encuentra los puntos de entrega más cercanos para tus <strong>Botellas de Amor</strong> y <strong>Ecoladrillos</strong>
        </p>
        <form method="POST" id="busquedaForm">
            <label for="ciudad">📍 ¿Dónde te encuentras?</label>
            <div class="input-group">
                <span class="input-icon">🌎</span>
                <input type="text" id="ciudad" name="ciudad" placeholder="Ej: Buenos Aires, Argentina" required autofocus autocomplete="off">
            </div>
            <button type="submit">🔍 Buscar Puntos de Entrega</button>
        </form>
        <div class="ejemplo">
            <strong>💡 Consejos para mejores resultados:</strong>
            • Incluye tu ciudad y país<br>
            • Sé específico si vives en una ciudad grande<br>
            • Usa el nombre oficial de tu localidad
        </div>
    </div>
    <script>
        document.getElementById('busquedaForm').addEventListener('submit', function(e) {
            const btn = this.querySelector('button');
            btn.innerHTML = '⏳ Buscando...';
            btn.disabled = true;
        });
    </script>
</body>
</html>`;

// Ruta GET: Mostrar formulario
app.get('/', (req, res) => {
  res.send(htmlFormulario);
});

// Ruta POST: Procesar búsqueda
app.post('/', async (req, res) => {
  const ciudad = req.body.ciudad;
  
  if (!ciudad) {
    return res.send(htmlFormulario);
  }

  console.log(`🔍 Búsqueda para: ${ciudad}`);
  const respuestaGemini = await consultarGemini(ciudad);

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
            line-height: 1.9;
            white-space: pre-wrap;
            border: 2px solid #e8f5e9;
            font-size: 15px;
            color: #2c3e50;
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
        <div class="resultado">${respuestaGemini}</div>
        <div class="info-box">
            <strong>💡 Recuerda:</strong> Antes de entregar tus botellas de amor, verifica que los plásticos estén limpios, secos y bien compactados. ¡Cada botella cuenta para el planeta!
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
    message: 'EcoLocalizador funcionando correctamente',
    hasApiKey: GEMINI_API_KEY !== 'TU_API_KEY_DE_GEMINI_AQUI'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('');
  console.log('✅ ================================================');
  console.log('✅  Servidor EcoLocalizador ACTIVO               ');
  console.log('✅ ================================================');
  console.log('');
  console.log(`🌍 Puerto: ${PORT}`);
  console.log(`🔑 API Key configurada: ${GEMINI_API_KEY !== 'TU_API_KEY_DE_GEMINI_AQUI' ? 'SÍ ✅' : 'NO ❌'}`);
  console.log('');
  if (GEMINI_API_KEY === 'TU_API_KEY_DE_GEMINI_AQUI') {
    console.log('⚠️  ADVERTENCIA: Configura GEMINI_API_KEY como variable de entorno');
  }
  console.log('');
});

// Manejo de errores
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
});
