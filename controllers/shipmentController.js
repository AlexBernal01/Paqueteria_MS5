const ShipmentModel = require('../models/shipmentModel');

const ShipmentController = {

    // =========================================
    // POST: Crear nuevo envío
    // =========================================
    async createShipment(req, res, bodyText) {
        try {
            const body = JSON.parse(bodyText);

            const {
                orderId,
                recipientName,
                address,
                zipCode,
                city,
                weight
            } = body;

            // Validaciones
            if (!orderId || !recipientName || !address || !zipCode || !city || !weight) {
                res.statusCode = 400;
                return res.end(JSON.stringify({
                    error: "Campos obligatorios incompletos"
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
                    error: "El código postal debe tener exactamente 5 dígitos"
                }));
            }

            // Generar tracking
            const trackingNumber = `TRACK-${Math.floor(100000 + Math.random() * 900000)}`;

            // Paquetería según peso
            const courier = weight > 10
                ? 'FedEx Heavy'
                : weight > 5
                    ? 'Estafeta Premium'
                    : 'DHL Express';

            // Guardar en modelo
            const result = await ShipmentModel.create({
                orderId,
                trackingNumber,
                courier,
                weight,
                recipientName,
                address,
                zipCode,
                city
            });

            res.statusCode = 201;
            res.end(JSON.stringify({
                mensaje: "Envío programado con éxito",
                data: result
            }));

        } catch (error) {
            res.statusCode = 400;
            res.end(JSON.stringify({
                error: "JSON inválido o error de base de datos",
                detalles: error.message
            }));
        }
    },

    // =========================================
    // GET: Obtener tracking por número de guía
    // =========================================
    async getTracking(res, trackingNumber) {
        try {
            const shipment = await ShipmentModel.findByTrackingNumber(trackingNumber);

            if (!shipment) {
                res.statusCode = 404;
                return res.end(JSON.stringify({
                    error: "Número de guía no localizado"
                }));
            }

            res.statusCode = 200;
            res.end(JSON.stringify(shipment));

        } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({
                error: "Fallo en la comunicación con la base de datos",
                detalles: error.message
            }));
        }
    },

    // =========================================
    // GET: Obtener todos los envíos
    // =========================================
    async getAllShipments(res) {
        try {
            const shipments = await ShipmentModel.getAll();

            res.statusCode = 200;
            res.end(JSON.stringify(shipments));

        } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({
                error: "Error obteniendo todos los envíos",
                detalles: error.message
            }));
        }
    },

    // =========================================
    // PUT: Actualizar estado del envío
    // =========================================
    async updateShipmentStatus(res, trackingNumber, bodyText) {
        try {
            const body = JSON.parse(bodyText);
            let { status, current_location } = body;

            // Primero obtener el estado actual del envío
            const shipmentActual = await ShipmentModel.findByTrackingNumber(trackingNumber);
            
            if (!shipmentActual) {
                res.statusCode = 404;
                return res.end(JSON.stringify({ error: "Número de guía no localizado" }));
            }

            const estadoActual = shipmentActual.tracking_events?.[0]?.status;
            
            // =========================================
            // BLOQUEAR ESTADOS TERMINALES
            // Si ya está CANCELADO o DEVUELTO, no se puede modificar
            // =========================================
            if (estadoActual === 'CANCELADO') {
                res.statusCode = 400;
                return res.end(JSON.stringify({
                    error: "❌ Este envío ya fue CANCELADO. No se puede modificar su estado."
                }));
            }
            
            if (estadoActual === 'DEVUELTO') {
                res.statusCode = 400;
                return res.end(JSON.stringify({
                    error: "❌ Este envío ya fue DEVUELTO. No se puede modificar su estado."
                }));
            }

            // Estados permitidos
            const validStatuses = ["PREPARACION", "RECOLECCION", "TRANSITO", "ENTREGADO"];
            
            if (!status || !validStatuses.includes(status)) {
                res.statusCode = 400;
                return res.end(JSON.stringify({
                    error: "Estado inválido. Usa PREPARACION, RECOLECCION, TRANSITO o ENTREGADO"
                }));
            }

            if (!current_location || current_location.trim() === "") {
                res.statusCode = 400;
                return res.end(JSON.stringify({
                    error: "La ubicación actual es obligatoria"
                }));
            }

            const result = await ShipmentModel.updateStatus(trackingNumber, status, current_location);

            if (!result) {
                res.statusCode = 404;
                return res.end(JSON.stringify({ error: "Número de guía no encontrado" }));
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

    // =========================================
    // DELETE: Cancelar envío
    // =========================================
    async cancelShipment(res, trackingNumber) {
        try {
            const shipment = await ShipmentModel.findByTrackingNumber(trackingNumber);

            if (!shipment) {
                res.statusCode = 404;
                return res.end(JSON.stringify({ error: "Número de guía no localizado" }));
            }

            const currentStatus = shipment.tracking_events?.[0]?.status;

            // Bloquear si ya está cancelado o devuelto
            if (currentStatus === 'CANCELADO') {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: "❌ Este envío ya está CANCELADO" }));
            }
            
            if (currentStatus === 'DEVUELTO') {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: "❌ Este envío ya está DEVUELTO" }));
            }

            if (currentStatus === 'ENTREGADO') {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: "❌ No se puede cancelar un envío entregado. Usa devolución." }));
            }

            let ubicacion = "";
            let mensaje = "";

            if (currentStatus === 'PREPARACION') {
                ubicacion = "Cancelado por el cliente - Sin proceso";
                mensaje = "✅ Envío cancelado exitosamente. El proceso ha sido detenido.";
            } else {
                ubicacion = "Devolución en proceso hacia el centro de envíos";
                mensaje = "✅ Cancelación exitosa. Se ha iniciado la devolución al centro de envíos.";
            }

            const result = await ShipmentModel.cancelShipment(trackingNumber, ubicacion);

            res.statusCode = 200;
            res.end(JSON.stringify({
                mensaje: mensaje,
                data: result
            }));

        } catch (error) {
            console.error("Error cancelando envío:", error);
            res.statusCode = 500;
            res.end(JSON.stringify({
                error: "Error al cancelar el envío",
                detalles: error.message
            }));
        }
    },

    // =========================================
    // POST: Devolución de envío
    // =========================================
    async returnShipment(res, trackingNumber) {
        try {
            const shipment = await ShipmentModel.findByTrackingNumber(trackingNumber);

            if (!shipment) {
                res.statusCode = 404;
                return res.end(JSON.stringify({ error: "Número de guía no localizado" }));
            }

            const currentStatus = shipment.tracking_events?.[0]?.status;

            // Bloquear si ya está cancelado o devuelto
            if (currentStatus === 'CANCELADO') {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: "❌ Este envío ya está CANCELADO" }));
            }
            
            if (currentStatus === 'DEVUELTO') {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: "❌ Este envío ya está DEVUELTO" }));
            }

            // Validar que se pueda devolver (a partir de RECOLECCION)
            if (currentStatus === 'PREPARACION') {
                res.statusCode = 400;
                return res.end(JSON.stringify({ 
                    error: "❌ Envío en preparación. Mejor cancela el pedido directamente.",
                    sugerencia: "Usa la opción de cancelar envío"
                }));
            }

            let ubicacion = "";
            let mensaje = "";

            if (currentStatus === 'ENTREGADO') {
                ubicacion = "Devolución solicitada - Esperando recolección en domicilio";
                mensaje = "✅ Devolución de producto solicitada. Se coordinará la recolección en domicilio.";
            } else {
                ubicacion = "Devolución en proceso - Paquete retornando al almacén";
                mensaje = "✅ Devolución solicitada. El paquete será regresado al centro de envíos.";
            }

            const result = await ShipmentModel.returnShipment(trackingNumber, ubicacion);

            res.statusCode = 200;
            res.end(JSON.stringify({
                mensaje: mensaje,
                data: result
            }));

        } catch (error) {
            console.error("Error en devolución:", error);
            res.statusCode = 500;
            res.end(JSON.stringify({
                error: "Error al procesar la devolución",
                detalles: error.message
            }));
        }
    }
};

module.exports = ShipmentController;