// Archivo: backend/src/server.js (Versión Simplificada y Corregida)

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Ya no necesitamos la librería de Imgur
// const { ImgurClient } = require('imgur'); 

const { PredictionServiceClient } = require('@google-cloud/aiplatform').v1;
const { helpers } = require('@google-cloud/aiplatform');

// --- CONFIGURACIÓN DE GOOGLE CLOUD ---
const PROJECT_ID = 'el-atelier-artesanal-ia';
const LOCATION = 'us-central1';
const PUBLISHER = 'google';
const MODEL = 'imagegeneration';
// ------------------------------------

const clientOptions = {
    apiEndpoint: 'us-central1-aiplatform.googleapis.com',
};
const predictionServiceClient = new PredictionServiceClient(clientOptions);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = process.env.PORT || 3001;

// --- RUTA AÑADIDA PARA SOLUCIONAR "CANNOT GET /" ---
app.get('/', (req, res) => {
    res.send('El servidor de El Atelier Artesanal está funcionando correctamente.');
});
// ----------------------------------------------------

app.post('/api/generate-jewelry', async (req, res) => {
    const { prompt } = req.body;
    console.log('Prompt recibido:', prompt);
    const fullPrompt = `fotografía de producto profesional, hiperrealista, de un: ${prompt}. Vista completa del objeto, centrado, sobre un soporte de joyería de terciopelo. Iluminación de estudio suave, 8k, enfoque nítido, fotografía macro.`;
    const negativePrompt = 'caricatura, render 3d, borroso, cortado, fuera de marco, deformado, texto, marca de agua.';
    
    try {
        const endpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/${PUBLISHER}/models/${MODEL}`;
        const instance = { prompt: fullPrompt };
        const instances = [helpers.toValue(instance)];
        const parameters = helpers.toValue({ sampleCount: 1, negativePrompt: negativePrompt });
        const request = { endpoint, instances, parameters };

        const [response] = await predictionServiceClient.predict(request);
        
        console.log('Respuesta completa de Google:', JSON.stringify(response, null, 2));
        
        const predictions = response.predictions;
        if (!predictions || predictions.length === 0 || !predictions[0].structValue.fields.bytesBase64Encoded) {
            throw new Error('La IA no devolvió una imagen. Esto suele ocurrir por los filtros de seguridad o un problema de facturación.');
        }

        const imageBase64 = predictions[0].structValue.fields.bytesBase64Encoded.stringValue;
        res.json({ imageBase64 });

    } catch (error) {
        console.error("Error al generar imagen con Vertex AI:", error);
        res.status(500).json({ error: 'Hubo un error al generar la imagen. Revisa los permisos y la facturación en Google Cloud.' });
    }
});

// La ruta /api/upload-image ha sido eliminada ya que no la necesitamos más.

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});