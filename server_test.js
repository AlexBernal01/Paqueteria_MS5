const http = require('http');

const server = http.createServer((req, res) => {
    console.log("Petición recibida:", req.method, req.url);
    
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ mensaje: "Servidor funcionando" }));
});

server.listen(3000, () => {
    console.log("Servidor de prueba corriendo en puerto 3000");
});