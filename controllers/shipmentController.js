const ShipmentModel = require('../models/shipmentModel');

const INVENTARIO_URL = process.env.INVENTARIO_URL || 'https://inventario-ms.onrender.com/api/stock/restore';
const INVENTARIO_SUBTRACT_URL = process.env.INVENTARIO_SUBTRACT_URL || 'https://inventario-ms.onrender.com/api/stock/subtract';

async function notificarInventarioSumar(orderId, trackingNumber, action, products) {
    if (!products || products.length === 0) {
        console.log('No hay productos para notificar');
        return;
    }

    try {
        const response = await fetch(INVENTARIO_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: orderId,
                trackingNumber: trackingNumber,
                action: action,
                products: products.map(p => ({
                    productId: p.product_id,
                    productName: p.product_name,
                    quantity: p.quantity,
                    sku: p.sku,
                    unitPrice: p.unit_price
                })),
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            console.error('Error notificando a inventario (sumar):', response.status);
        } else {
            console.log('Inventario notificado correctamente (sumar)');
        }
    } catch (error) {
        console.error('Fallo conexión con inventario (sumar):', error.message);
    }
}

async function notificarInventarioRestar(orderId, products) {
    if (!products || products.length === 0) {
        console.log('No hay productos para restar');
        return;
    }

    try {
        const response = await fetch(INVENTARIO_SUBTRACT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: orderId,
                action: 'CREACION_ENVIO',
                products: products.map(p => ({
                    productId: p.productId,
                    productName: p.productName,
                    quantity: p.quantity,
                    sku: p.sku,
                    unitPrice: p.unitPrice
                })),
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            console.error('Error restando stock:', response.status);
        } else {
            console.log('Stock restado correctamente');
        }
    } catch (error) {
        console.error('Fallo conexión con inventario (restar):', error.message);
    }
}

const ShipmentController = {

    async createShipment(req, res, bodyText) {
        try {
            const body = JSON.parse(bodyText);

            const {
                orderId,
                recipientName,
                address,
                zipCode,
                city,
                weight,
                products
            } = body;

            if (!orderId || !recipientName || !address || !zipCode || !city || !weight) {
                res.statusCode = 400;
                return res.end(JSON.stringify({
                    error: "Campos obligatorios incompletos"
                }));
            }

            if (!products || !Array.isArray(products) || products.length === 0) {
                res.statusCode = 400;
                return res.end(JSON.stringify({
                    error: "Se requiere la lista de productos del envio"
                }));
            }

            if (typeof weight !== 'number' || weight <= 0) {
                res.statusCode = 400;
                return res.end(JSON.stringify({
                    error: "El peso debe ser mayor a 0"
                }));
            }

            if (!/^[0-9]{5}$/.test(zipCode)) {
                res.statusCode = 400;
                return res.end(JSON.stringify({
                    error: "El codigo postal debe tener exactamente 5 digitos"
                }));
            }

            for (const product of products) {
                if (!product.productId || !product.productName || !product.quantity || product.quantity <= 0) {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({
                        error: "Cada producto debe tener productId, productName y quantity mayor a 0"
                    }));
                }
            }

            // RESTAR STOCK EN INVENTARIO
            await notificarInventarioRestar(orderId, products);

            const trackingNumber = `TRACK-${Math.floor(100000 + Math.random() * 900000)}`;

            const courier = weight > 10
                ? 'FedEx Heavy'
                : weight > 5
                    ? 'Estafeta Premium'
                    : 'DHL Express';

            const result = await ShipmentModel.create({
                orderId,
                trackingNumber,
                courier,
                weight,
                recipientName,
                address,
                zipCode,
                city,
                products
            });

            res.statusCode = 201;
            res.end(JSON.stringify({
                mensaje: "Envio programado con exito",
                data: result
            }));

        } catch (error) {
            res.statusCode = 400;
            res.end(JSON.stringify({
                error: "JSON invalido o error de base de datos",
                detalles: error.message
            }));
        }
    },

    async getTracking(res, trackingNumber) {
        try {
            const shipment = await ShipmentModel.findByTrackingNumber(trackingNumber);

            if (!shipment) {
                res.statusCode = 404;
                return res.end(JSON.stringify({
                    error: "Numero de guia no localizado"
                }));
            }

            res.statusCode = 200;
            res.end(JSON.stringify(shipment));

        } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({
                error: "Fallo en la comunicacion con la base de datos",
                detalles: error.message
            }));
        }
    },

    async getAllShipments(res) {
        try {
            const shipments = await ShipmentModel.getAll();

            res.statusCode = 200;
            res.end(JSON.stringify(shipments));

        } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({
                error: "Error obteniendo todos los envios",
                detalles: error.message
            }));
        }
    },

    async updateShipmentStatus(res, trackingNumber, bodyText) {
        try {
            const body = JSON.parse(bodyText);
            let { status, current_location } = body;

            const shipmentActual = await ShipmentModel.findByTrackingNumber(trackingNumber);
            
            if (!shipmentActual) {
                res.statusCode = 404;
                return res.end(JSON.stringify({ error: "Numero de guia no localizado" }));
            }

            const estadoActual = shipmentActual.tracking_events?.[0]?.status;
            
            if (estadoActual === 'CANCELADO') {
                res.statusCode = 400;
                return res.end(JSON.stringify({
                    error: "Este envio ya fue CANCELADO. No se puede modificar su estado."
                }));
            }
            
            if (estadoActual === 'DEVUELTO') {
                res.statusCode = 400;
                return res.end(JSON.stringify({
                    error: "Este envio ya fue DEVUELTO. No se puede modificar su estado."
                }));
            }

            const validStatuses = ["PREPARACION", "RECOLECCION", "TRANSITO", "ENTREGADO"];
            
            if (!status || !validStatuses.includes(status)) {
                res.statusCode = 400;
                return res.end(JSON.stringify({
                    error: "Estado invalido. Usa PREPARACION, RECOLECCION, TRANSITO o ENTREGADO"
                }));
            }

            if (!current_location || current_location.trim() === "") {
                res.statusCode = 400;
                return res.end(JSON.stringify({
                    error: "La ubicacion actual es obligatoria"
                }));
            }

            const result = await ShipmentModel.updateStatus(trackingNumber, status, current_location);

            if (!result) {
                res.statusCode = 404;
                return res.end(JSON.stringify({ error: "Numero de guia no encontrado" }));
            }

            res.statusCode = 200;
            res.end(JSON.stringify({
                mensaje: "Estado actualizado correctamente",
                data: result
            }));

        } catch (error) {
            res.statusCode = 400;
            res.end(JSON.stringify({
                error: "Error actualizando estado",
                detalles: error.message
            }));
        }
    },

    async cancelShipment(res, trackingNumber) {
        try {
            const shipment = await ShipmentModel.findByTrackingNumber(trackingNumber);

            if (!shipment) {
                res.statusCode = 404;
                return res.end(JSON.stringify({ error: "Numero de guia no localizado" }));
            }

            const currentStatus = shipment.tracking_events?.[0]?.status;

            if (currentStatus === 'CANCELADO') {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: "Este envio ya esta CANCELADO" }));
            }
            
            if (currentStatus === 'DEVUELTO') {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: "Este envio ya esta DEVUELTO" }));
            }

            if (currentStatus === 'ENTREGADO') {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: "No se puede cancelar un envio entregado. Usa devolucion." }));
            }

            let ubicacion = "";
            let mensaje = "";

            if (currentStatus === 'PREPARACION') {
                ubicacion = "Cancelado por el cliente - Sin proceso";
                mensaje = "Envio cancelado exitosamente. El proceso ha sido detenido.";
            } else {
                ubicacion = "Devolucion en proceso hacia el centro de envios";
                mensaje = "Cancelacion exitosa. Se ha iniciado la devolucion al centro de envios.";
            }

            const result = await ShipmentModel.cancelShipment(trackingNumber, ubicacion);

            // SUMAR STOCK EN INVENTARIO
            await notificarInventarioSumar(result.order_id, trackingNumber, 'CANCELACION', result.products);

            res.statusCode = 200;
            res.end(JSON.stringify({
                mensaje: mensaje,
                data: result
            }));

        } catch (error) {
            console.error("Error cancelando envio:", error);
            res.statusCode = 500;
            res.end(JSON.stringify({
                error: "Error al cancelar el envio",
                detalles: error.message
            }));
        }
    },

    async returnShipment(res, trackingNumber) {
        try {
            const shipment = await ShipmentModel.findByTrackingNumber(trackingNumber);

            if (!shipment) {
                res.statusCode = 404;
                return res.end(JSON.stringify({ error: "Numero de guia no localizado" }));
            }

            const currentStatus = shipment.tracking_events?.[0]?.status;

            if (currentStatus === 'CANCELADO') {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: "Este envio ya esta CANCELADO" }));
            }
            
            if (currentStatus === 'DEVUELTO') {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: "Este envio ya esta DEVUELTO" }));
            }

            if (currentStatus === 'PREPARACION') {
                res.statusCode = 400;
                return res.end(JSON.stringify({ 
                    error: "Envio en preparacion. Mejor cancela el pedido directamente.",
                    sugerencia: "Usa la opcion de cancelar envio"
                }));
            }

            let ubicacion = "";
            let mensaje = "";

            if (currentStatus === 'ENTREGADO') {
                ubicacion = "Devolucion solicitada - Esperando recoleccion en domicilio";
                mensaje = "Devolucion de producto solicitada. Se coordinara la recoleccion en domicilio.";
            } else {
                ubicacion = "Devolucion en proceso - Paquete retornando al almacen";
                mensaje = "Devolucion solicitada. El paquete sera regresado al centro de envios.";
            }

            const result = await ShipmentModel.returnShipment(trackingNumber, ubicacion);

            // SUMAR STOCK EN INVENTARIO (DEVOLUCION)
            await notificarInventarioSumar(result.order_id, trackingNumber, 'DEVOLUCION', result.products);

            res.statusCode = 200;
            res.end(JSON.stringify({
                mensaje: mensaje,
                data: result
            }));

        } catch (error) {
            console.error("Error en devolucion:", error);
            res.statusCode = 500;
            res.end(JSON.stringify({
                error: "Error al procesar la devolucion",
                detalles: error.message
            }));
        }
    }
};

module.exports = ShipmentController;