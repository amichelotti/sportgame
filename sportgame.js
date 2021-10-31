const http = require('http');
const WebSocketServer = require('websocket').server;
const server = http.createServer();
server.listen(3001);
const wsServer = new WebSocketServer({
    httpServer: server
});
console.log("startimg server on 3001");

wsServer.on('request', function(request) {
    const connection = request.accept(null, request.origin);
    console.log("someone connected");
    connection.on('message', function(message) {
      console.log('Received Message:', message.utf8Data);
      connection.sendUTF(message.utf8Data+' Hi this is WebSocket server!');
    });
    connection.on('close', function(reasonCode, description) {
        console.log('Client has disconnected.');
    });
});