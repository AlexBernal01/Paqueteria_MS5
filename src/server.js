const http = require('http');
const fs = require('fs');
const path = require('path');
const shipmentRoutes = require('./routes/shipmentRoutes');

const PORT = 3000;

const server = http.createServer((req, res) => {
    res.setHeader('X-Company-Name', 'Urban Market');
    res.setHeader('X-Company-Email', 'soporte@urbanmarket.com');
    
    console.log("=== NUEVA PETICION ===");
    console.log("Metodo:", req.method);
    console.log("URL:", req.url);
    
    try {
        if (req.url === '/' && req.method === 'GET') {
            console.log("Sirviendo index.html");
            const filePath = path.join(__dirname, 'public', 'index.html');
            fs.readFile(filePath, (err, content) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Error');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
            });
        }
        else if (req.url === '/styles.css' && req.method === 'GET') {
            console.log("Sirviendo styles.css");
            const filePath = path.join(__dirname, 'public', 'styles.css');
            fs.readFile(filePath, (err, content) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Error');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/css' });
                res.end(content);
            });
        }
        else if (req.url === '/app.js' && req.method === 'GET') {
            console.log("Sirviendo app.js");
            const filePath = path.join(__dirname, 'public', 'app.js');
            fs.readFile(filePath, (err, content) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Error');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/javascript' });
                res.end(content);
            });
        }
        else if (req.url === '/UMA.png' && req.method === 'GET') {
            console.log("Sirviendo logo UMA.png");
            const filePath = path.join(__dirname, 'public', 'UMA.png');
            fs.readFile(filePath, (err, content) => {
                if (err) {
                    console.error("Logo no encontrado:", filePath);
                    res.writeHead(404);
                    res.end();
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'image/png' });
                res.end(content);
            });
        }
        else {
            console.log("Llamando a shipmentRoutes");
            shipmentRoutes(req, res);
        }
    } catch (error) {
        console.error("Error en server:", error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: error.message }));
    }
});

server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

server.on('error', (error) => {
    console.error("Error del servidor:", error);
});