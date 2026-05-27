const supabase = require('../config/supabase');

const ShipmentModel = {

    async create(shipmentData) {
        const {
            orderId,
            trackingNumber,
            courier,
            weight,
            recipientName,
            address,
            zipCode,
            city,
            products
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
                current_location: 'Almacen Central Puebla'
            }]);

        if (trackingError) throw trackingError;

        if (products && products.length > 0) {
            const productsToInsert = products.map(p => ({
                shipment_id: shipment.id,
                product_id: p.productId,
                product_name: p.productName,
                quantity: p.quantity,
                sku: p.sku || null,
                unit_price: p.unitPrice || null
            }));

            const { error: productsError } = await supabase
                .from('shipment_products')
                .insert(productsToInsert);

            if (productsError) throw productsError;
        }

        return {
            trackingNumber,
            status: 'PREPARACION'
        };
    },

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
                ),
                shipment_products (
                    product_id,
                    product_name,
                    quantity,
                    sku,
                    unit_price
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
                ),
                shipment_products (
                    product_id,
                    product_name,
                    quantity,
                    sku,
                    unit_price
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

    async cancelShipment(trackingNumber, ubicacion) {
        const { data: shipment, error: shipmentError } = await supabase
            .from('shipments')
            .select('id, order_id')
            .eq('tracking_number', trackingNumber)
            .single();

        if (shipmentError || !shipment) return null;

        const { data: products, error: productsError } = await supabase
            .from('shipment_products')
            .select('product_id, product_name, quantity, sku, unit_price')
            .eq('shipment_id', shipment.id);

        if (productsError) throw productsError;

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
            updated_at: data.updated_at,
            order_id: shipment.order_id,
            products: products || []
        };
    },

    async returnShipment(trackingNumber, ubicacion) {
        const { data: shipment, error: shipmentError } = await supabase
            .from('shipments')
            .select('id, order_id')
            .eq('tracking_number', trackingNumber)
            .single();

        if (shipmentError || !shipment) return null;

        const { data: products, error: productsError } = await supabase
            .from('shipment_products')
            .select('product_id, product_name, quantity, sku, unit_price')
            .eq('shipment_id', shipment.id);

        if (productsError) throw productsError;

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
            updated_at: data.updated_at,
            order_id: shipment.order_id,
            products: products || []
        };
    }
};

module.exports = ShipmentModel;