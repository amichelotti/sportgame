const http = require('http');
const WebSocketServer = require('websocket').server;
const server = http.createServer();
server.listen(3001);
const wsServer = new WebSocketServer({
    httpServer: server
});
console.log("starting server on 3001");
var players={}; //players info
var start_game_time_out=null;
var update_stats_interval=2000;
var game_starts_in=5000;
var game_duration=120000;
var time_elapsed=0;

function reset_game(){
    players={}; //players info
    time_elapsed=0;
      
}
function listOfPlayers(){
    var l=[];
    for(var k in players){
        l.push(k);
    }
    return l;
}
function sendAll(d){
    var list=listOfPlayers();
    console.log("sending ->"+JSON.stringify(d));
    list.forEach(e=>{
        e['connection'].sentUTF(JSON.stringify(d));
    });
}
function playerScoreSort(){
    var list=[];
    for(var k in players){
        //make a list of {playersname,score}
        list.push({player:players[k].player,score:players[k].score});
    }
    list.sort((a,b) =>{return b['score']-a['score'];} )
    return list;
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
                if(!players.hasOwnProperty(data['device'])){
                    // not exitst, add an entry with connection, player name and join time
                    players[data['device']]={
                        connection:connection,
                        player:data['player'],
                        score:0,// initial score
                        ts:new Date()
                    };
                    console.log("added:"+data['player']);
                    
                    var d={
                        cmd:"player_list_update",
                        player_list:listOfPlayers(),
                        new_player:data['player'],
                        game_countdown:game_starts_in

                    }
                    sendAll(d); // communicate all the new list
                    if(start_game_time_out!=null){
                        // reset a previously set timeout
                        clearTimeout(start_game_time_out);
                    }
                    // if a new player joined restart timeout
                    start_game_time_out=setTimeout(()=>{
                        // send command start game to all
                        var d={
                            cmd:"start",
                            game_end:game_duration
                        }
                        sendAll(d);
                        var upd_int=setInterval(()=>{
                            time_elapsed+=update_stats_interval;
                            var d={
                                cmd:"stats",
                                result:playerScoreSort(),
                                time_end:(game_duration-time_elapsed) // tempo rimanente
                            }
                            sendAll(d);
                            //
                        },update_stats_interval);
                        // set the timeout for the end of the game
                        setTimeout(()=>{
                            var d={
                                cmd:"stop",
                                result:playerScoreSort(),

                            }
                            sendAll(d);
                            clearInterval(upd_int);
                            // clear the players list
                            reset_game();

                        },game_duration);
                    },game_starts_in);
                } else {
                    console.log("Player "+data['player_list']+ " already joined");
                }
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
        // find the user in the player list (if any) and remove it
        console.log('Client has disconnected.');

        for(var k in players){
            if(players[k].connection.remoteAddress==connection.remoteAddress){
                console.log(players[k].player+' left the game');
                delete players[k];
            }
        }
    });
});