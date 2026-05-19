const supabase = require('../config/supabase');

const ShipmentModel = {

    // =========================================
    // CREATE: Crear envío nuevo
    // =========================================
    async create(shipmentData) {
        const {
            orderId,
            trackingNumber,
            courier,
            weight,
            recipientName,
            address,
            zipCode,
            city
        } = shipmentData;

        const { data: shipment, error: shipmentError } = await supabase
            .from('shipments')
            .insert([{
                order_id: orderId,
                tracking_number: trackingNumber,
                courier,
                weight
            }])
            .select()
            .single();

        if (shipmentError) throw shipmentError;

        const { error: addressError } = await supabase
            .from('shipping_addresses')
            .insert([{
                shipment_id: shipment.id,
                recipient_name: recipientName,
                address_line: address,
                zip_code: zipCode,
                city
            }]);

        if (addressError) throw addressError;

        const { error: trackingError } = await supabase
            .from('tracking_events')
            .insert([{
                shipment_id: shipment.id,
                status: 'PREPARACION',
                current_location: 'Almacén Central Puebla'
            }]);

        if (trackingError) throw trackingError;

        return {
            trackingNumber,
            status: 'PREPARACION'
        };
    },

    // =========================================
    // GET ALL: Obtener todos los envíos
    // =========================================
    async getAll() {
        const { data, error } = await supabase
            .from('shipments')
            .select(`
                id,
                order_id,
                tracking_number,
                courier,
                weight,
                created_at,
                shipping_addresses (
                    recipient_name,
                    address_line,
                    zip_code,
                    city
                ),
                tracking_events (
                    status,
                    current_location,
                    updated_at
                )
            `)
            .order('id', { ascending: true });

        if (error) throw error;

        if (data) {
            data.forEach(shipment => {
                if (shipment.tracking_events && shipment.tracking_events.length > 0) {
                    shipment.tracking_events.sort((a, b) => 
                        new Date(b.updated_at) - new Date(a.updated_at)
                    );
                }
            });
        }

        return data || [];
    },

    // =========================================
    // FIND BY TRACKING NUMBER
    // =========================================
    async findByTrackingNumber(trackingNumber) {
        const { data, error } = await supabase
            .from('shipments')
            .select(`
                id,
                order_id,
                tracking_number,
                courier,
                weight,
                created_at,
                shipping_addresses (
                    recipient_name,
                    address_line,
                    zip_code,
                    city
                ),
                tracking_events (
                    status,
                    current_location,
                    updated_at
                )
            `)
            .eq('tracking_number', trackingNumber)
            .single();

        if (error || !data) return null;

        if (data.tracking_events && data.tracking_events.length > 0) {
            data.tracking_events.sort((a, b) => 
                new Date(b.updated_at) - new Date(a.updated_at)
            );
        }

        return data;
    },

    // =========================================
    // UPDATE STATUS
    // =========================================
    async updateStatus(trackingNumber, status, currentLocation) {
        const { data: shipment, error: shipmentError } = await supabase
            .from('shipments')
            .select('id')
            .eq('tracking_number', trackingNumber)
            .single();

        if (shipmentError || !shipment) return null;

        const { data, error } = await supabase
            .from('tracking_events')
            .insert([{
                shipment_id: shipment.id,
                status: status,
                current_location: currentLocation,
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;

        return {
            trackingNumber: trackingNumber,
            status: data.status,
            current_location: data.current_location,
            updated_at: data.updated_at
        };
    },

    // =========================================
    // CANCEL SHIPMENT
    // =========================================
    async cancelShipment(trackingNumber, ubicacion) {
        const { data: shipment, error: shipmentError } = await supabase
            .from('shipments')
            .select('id')
            .eq('tracking_number', trackingNumber)
            .single();

        if (shipmentError || !shipment) return null;

        const { data, error } = await supabase
            .from('tracking_events')
            .insert([{
                shipment_id: shipment.id,
                status: 'CANCELADO',
                current_location: ubicacion,
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;

        return {
            trackingNumber: trackingNumber,
            status: 'CANCELADO',
            current_location: ubicacion,
            updated_at: data.updated_at
        };
    },

    // =========================================
    // RETURN SHIPMENT
    // =========================================
    async returnShipment(trackingNumber, ubicacion) {
        const { data: shipment, error: shipmentError } = await supabase
            .from('shipments')
            .select('id')
            .eq('tracking_number', trackingNumber)
            .single();

        if (shipmentError || !shipment) return null;

        const { data, error } = await supabase
            .from('tracking_events')
            .insert([{
                shipment_id: shipment.id,
                status: 'DEVUELTO',
                current_location: ubicacion,
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;

        return {
            trackingNumber: trackingNumber,
            status: 'DEVUELTO',
            current_location: ubicacion,
            updated_at: data.updated_at
        };
    }
};

module.exports = ShipmentModel;