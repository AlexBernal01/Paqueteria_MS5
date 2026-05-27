const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Microservicio de Logistica - API de Envios',
      version: '1.0.0',
      description: 'API para gestion de envios, tracking, cancelaciones y devoluciones',
      contact: {
        name: 'Equipo de Logistica',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor local',
      },
    ],
    components: {
      schemas: {
        CreateShipment: {
          type: 'object',
          required: ['orderId', 'recipientName', 'address', 'zipCode', 'city', 'weight'],
          properties: {
            orderId: {
              type: 'string',
              example: 'ORD-12345',
            },
            recipientName: {
              type: 'string',
              example: 'Juan Perez',
            },
            address: {
              type: 'string',
              example: 'Calle Falsa 123',
            },
            zipCode: {
              type: 'string',
              pattern: '^[0-9]{5}$',
              example: '12345',
            },
            city: {
              type: 'string',
              example: 'Ciudad de Mexico',
            },
            weight: {
              type: 'number',
              minimum: 0,
              example: 5.5,
            },
          },
        },
        ShipmentResponse: {
          type: 'object',
          properties: {
            mensaje: {
              type: 'string',
              example: 'Envio programado con exito',
            },
            data: {
              type: 'object',
              properties: {
                trackingNumber: {
                  type: 'string',
                  example: 'TRACK-123456',
                },
                status: {
                  type: 'string',
                  example: 'PREPARACION',
                },
              },
            },
          },
        },
        UpdateStatus: {
          type: 'object',
          required: ['status', 'current_location'],
          properties: {
            status: {
              type: 'string',
              enum: ['PREPARACION', 'RECOLECCION', 'TRANSITO', 'ENTREGADO'],
              example: 'TRANSITO',
            },
            current_location: {
              type: 'string',
              example: 'Centro de distribucion CDMX',
            },
          },
        },
        TrackingResponse: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            order_id: { type: 'string' },
            tracking_number: { type: 'string' },
            courier: { type: 'string' },
            weight: { type: 'number' },
            created_at: { type: 'string', format: 'date-time' },
            shipping_addresses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  recipient_name: { type: 'string' },
                  address_line: { type: 'string' },
                  zip_code: { type: 'string' },
                  city: { type: 'string' },
                },
              },
            },
            tracking_events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  current_location: { type: 'string' },
                  updated_at: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Mensaje de error',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Shipments',
        description: 'Operaciones de gestion de envios',
      },
      {
        name: 'Tracking',
        description: 'Consulta de tracking',
      },
      {
        name: 'Status',
        description: 'Actualizacion de estado',
      },
    ],
  },
  apis: ['./routes/shipmentRoutes.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec };