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