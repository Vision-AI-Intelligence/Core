const app = require('express')();
const http = require('http');
const port = 3000
const host = "localhost";
http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('Hello Teo!');
    res.end();
}).listen(port);
app.listen(port, host, () => console.log(`App is listening on port ${port}`));