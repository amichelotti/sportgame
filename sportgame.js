const http = require('http');
const WebSocketServer = require('websocket').server;
const server = http.createServer();
server.listen(3001);
const wsServer = new WebSocketServer({
    httpServer: server
});
console.log("starting server on 3001");
var players={}; //players info
function listOfPlayers(){
    var l=[];
    for(var k in players){
        l.push(k);
    }
    return l;
}
wsServer.on('request', function(request) {
    const connection = request.accept(null, request.origin);
    console.log("someone connected");
    connection.on('message', function(message) {
      console.log('Received Message:', message.utf8Data);
      try{
        var data=JSON.parse( message.utf8Data);//DECODE STRING INTO JSON OBJECT
        if(data.hasOwnProperty("device")&&(data.hasOwnProperty("cmd"))){
            // i pacchetti dal client devono avere sempre il deviceid (il telefono) ed il comando da fare
            if(data['cmd']=="request_to_join"){
                players[data['device']]=data; // infila nella mappa device a cui e' associato il player
                console.log("added:"+data['player']);
                data['player_list']=listOfPlayers();
                data['cmd']="player_list";
                var d={
                    cmd:"player_list",
                    player_list:listOfPlayers()

                }
                players['connection']=connection; // save the connection for further communications
                //answer with the current player list 
                connection.sendUTF(JSON.stringify(d)); // return the list of current players, must be sent as string so JSON.stringify
            } else if(data['cmd']=="player_list"){
                var d={
                    'cmd':"player_list",
                    'player_list':listOfPlayers()
                }
                connection.sendUTF(JSON.stringify(d)); // return the list of current players

            }

        }
      } catch(e){
          console.log("## error :"+e);
      }
    });
    connection.on('close', function(reasonCode, description) {
        console.log('Client has disconnected.');
    });
});