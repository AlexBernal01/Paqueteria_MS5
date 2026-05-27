 /** 
 @openapi
 * /shipments:
 *   get:
 *     summary: Obtener todos los envios
 *     tags: [Shipments]
 *     responses:
 *       200:
 *         description: Lista de todos los envios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TrackingResponse'
 *       500:
 *         description: Error del servidor
 * 
 *   post:
 *     summary: Crear un nuevo envio
 *     tags: [Shipments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateShipment'
 *     responses:
 *       201:
 *         description: Envio creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShipmentResponse'
 *       400:
 *         description: Datos invalidos
 *
 * /shipments/{trackingNumber}:
 *   get:
 *     summary: Obtener tracking de un envio
 *     tags: [Tracking]
 *     parameters:
 *       - name: trackingNumber
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Informacion del envio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackingResponse'
 *       404:
 *         description: Envio no encontrado
 *
 * /shipments/{trackingNumber}/status:
 *   put:
 *     summary: Actualizar estado de un envio
 *     tags: [Status]
 *     parameters:
 *       - name: trackingNumber
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStatus'
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       400:
 *         description: Estado invalido o envio cancelado
 *       404:
 *         description: Envio no encontrado
 *
 * /shipments/{trackingNumber}/cancel:
 *   delete:
 *     summary: Cancelar un envio
 *     tags: [Shipments]
 *     parameters:
 *       - name: trackingNumber
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Envio cancelado
 *       400:
 *         description: No se puede cancelar
 *       404:
 *         description: Envio no encontrado
 *
 * /shipments/{trackingNumber}/return:
 *   post:
 *     summary: Solicitar devolucion de un envio
 *     tags: [Shipments]
 *     parameters:
 *       - name: trackingNumber
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Devolucion solicitada
 *       400:
 *         description: No se puede devolver
 *       404:
 *         description: Envio no encontrado
 */



const ShipmentController = require('../controllers/shipmentController');

const shipmentRoutes = (req, res) => {

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Company-Name', 'Mi Empresa Logistica');
    res.setHeader('X-Company-Email', 'logistica@miempresa.com');

    const { method, url } = req;

    console.log("shipmentRoutes - Procesando:", method, url);

    if (url === '/shipments' && method === 'GET') {
        console.log("Ruta: GET /shipments");
        ShipmentController.getAllShipments(res);
    }

    else if (url === '/shipments' && method === 'POST') {
        console.log("Ruta: POST /shipments");
        let body = [];
        req.on('data', (chunk) => body.push(chunk));
        req.on('end', () => {
            const bodyText = Buffer.concat(body).toString();
            ShipmentController.createShipment(req, res, bodyText);
        });
    }

    else if (url.startsWith('/shipments/') && url.endsWith('/status') && method === 'PUT') {
        console.log("Ruta: PUT /shipments/.../status");
        let body = [];
        req.on('data', (chunk) => body.push(chunk));
        req.on('end', () => {
            const bodyText = Buffer.concat(body).toString();
            const urlParts = url.split('/');
            const trackingNumber = urlParts[2];
            ShipmentController.updateShipmentStatus(res, trackingNumber, bodyText);
        });
    }

    else if (url.startsWith('/shipments/') && url.endsWith('/cancel') && method === 'DELETE') {
        console.log("Ruta: DELETE /shipments/.../cancel");
        const urlParts = url.split('/');
        const trackingNumber = urlParts[2];
        ShipmentController.cancelShipment(res, trackingNumber);
    }

    else if (url.startsWith('/shipments/') && url.endsWith('/return') && method === 'POST') {
        console.log("Ruta: POST /shipments/.../return");
        const urlParts = url.split('/');
        const trackingNumber = urlParts[2];
        ShipmentController.returnShipment(res, trackingNumber);
    }

    else if (url.startsWith('/shipments/') && method === 'GET') {
        console.log("Ruta: GET /shipments/...");
        const urlParts = url.split('/');
        const trackingNumber = urlParts[2];
        ShipmentController.getTracking(res, trackingNumber);
    }

    else {
        console.log("Ruta no encontrada:", method, url);
        res.statusCode = 404;
        res.end(JSON.stringify({
            error: "Ruta no soportada por el microservicio"
        }));
    }
};

module.exports = shipmentRoutes;