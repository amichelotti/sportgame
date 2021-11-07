const http = require('http');
const WebSocketServer = require('websocket').server;
var giocatori=[];
const server = http.createServer();
const port=3001;
server.listen(port);
const wsServer = new WebSocketServer({
    httpServer: server
});
console.log("starting server on port:"+port);
//console.log("aggiornato");
var players={}; //players info
var start_game_time_out=null;
var update_stats_interval=20000;
var game_starts_in=10000;
var game_duration=120000;
var time_elapsed=0;
var player_id=0;
var msg_id=0;
function reset_game(){
    players={}; //players info
    time_elapsed=0;
    player_id=0;
      
}
function listOfPlayers(){
    var l=[];
    for(var k in players){
        l.push(players[k].player);
    }
    return l;
}
function sendAll(d){
    d['msgid']=msg_id++;
    console.log("sending ->"+JSON.stringify(d));
    for(var k in players){
    
      players[k]['connection'].sendUTF(JSON.stringify(d));
    
    }
}
function playerScoreSort(){
    var list=[];
    for(var k in players){
        //make a list of {playersname,score}
        list.push({player:players[k].player,score:players[k].score,id:players[k].id});
    }
    list.sort((a,b) =>{return b['score']-a['score'];} )
    return list;
}
wsServer.on('request', function(request) {
    var connection = request.accept(null, request.origin);
    let uid = (Math.random() + 1).toString(36).substring(7);
    console.log("someone connected");
    connection['uid']=uid;
    connection.on('message', function(message) {
      console.log('Received Message:', message.utf8Data);
      try{
        var data=JSON.parse( message.utf8Data);//DECODE STRING INTO JSON OBJECT
        if(data.hasOwnProperty("device")&&(data.hasOwnProperty("cmd"))){
            // i pacchetti dal client devono avere sempre il deviceid (il telefono) ed il comando da fare
            if(data['cmd']=="request_to_join"){
                if(!players.hasOwnProperty(data['device'])){
                    // not exitst, add an entry with connection, player name and join time
		    player_id++;
		    players[data['device']]={
		        connection:connection,
                        player:data['player'],
                        score:0,// initial score
                        ts:new Date(),
			id:player_id
			
                    };
		    
                    console.log("added:"+data['player']);
                    
                    var d={
                        cmd:"player_list_update",
                        player_list:listOfPlayers(),
                        new_player:data['player'],
			id:player_id,
			device:data['device'],
                        game_countdown:game_starts_in/1000
			
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
			    result:playerScoreSort(),
                            time_end:game_duration/1000
                        }
                        sendAll(d);
                        var upd_int=setInterval(()=>{
                            time_elapsed+=update_stats_interval;
                            var d={
                                cmd:"stats",
                                result:playerScoreSort(),
                                time_end:(game_duration-time_elapsed)/1000 // tempo rimanente
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

            } else if(data['cmd']=="update_score"){
		if(players.hasOwnProperty(data['device'])){
		    players[data['device']]['score']=data['score'];
		    console.log("updated:"+JSON.stringify(data['device']));
		}

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
            if(players[k].connection.uid==connection.uid){
                console.log(players[k].player+' left the game');
                delete players[k];
            }
        }
    });
});

