const http = require('http');
const fs = require('fs');
const shipmentRoutes = require('./routes/shipmentRoutes');
const { swaggerSpec } = require('./swagger');

const PORT = process.env.PORT || 3000;

function serveStaticFile(req, res, filePath, contentType) {
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end();
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
}

function serveSwaggerUI(req, res) {
    if (req.url === '/api-docs') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>API Logistica - Documentacion</title>
                <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
            </head>
            <body>
                <div id="swagger-ui"></div>
                <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
                <script>
                    window.onload = () => {
                        SwaggerUIBundle({
                            url: "/api-docs.json",
                            dom_id: '#swagger-ui',
                        });
                    };
                </script>
            </body>
            </html>
        `);
        return true;
    }
    
    if (req.url === '/api-docs.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(swaggerSpec));
        return true;
    }
    
    return false;
}

const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    
    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'healthy', 
            service: 'shipment-service',
            timestamp: new Date().toISOString()
        }));
        return;
    }
    
    if (serveSwaggerUI(req, res)) {
        return;
    }
    
    if (req.url === '/' || req.url === '/index.html') {
        serveStaticFile(req, res, './public/index.html', 'text/html');
        return;
    }
    
    if (req.url === '/styles.css') {
        serveStaticFile(req, res, './public/styles.css', 'text/css');
        return;
    }
    
    if (req.url === '/app.js') {
        serveStaticFile(req, res, './public/app.js', 'application/javascript');
        return;
    }
    
    if (req.url === '/UMA.png') {
        serveStaticFile(req, res, './public/UMA.png', 'image/png');
        return;
    }
    
    try {
        shipmentRoutes(req, res);
    } catch (error) {
        console.error('Error:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Internal server error' }));
    }
});

server.listen(PORT, () => {
    console.log(`Servicio corriendo en http://localhost:${PORT}`);
    console.log(`Documentacion Swagger en http://localhost:${PORT}/api-docs`);
});

server.on('error', (error) => {
    console.error('Error del servidor:', error);
});