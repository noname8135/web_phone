'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');

var fileServer = new(nodeStatic.Server)();
var app = http.createServer(function(req, res) {
  fileServer.serve(req, res);
}).listen(8080);

var io = socketIO.listen(app);
var room;
var caller_in = false, receiver_in = false;

io.sockets.on('connection', function(socket) {
  //console.log(socket);
  socket.on('join request', function(user_info, ready){
    console.log(user_info,'asked to join');
    room = user_info['room'];
    socket.join(room);

    if(user_info['id'] === 'A'){
      if(receiver_in === true){
        ready(true);
        socket.to(room).emit('ready');
      }
      caller_in = true;
      
    } 
    else if(user_info['id'] === 'B')
      if(caller_in === true){
        socket.to(room).emit('ready');
        ready(true);
      }
      receiver_in = true;
  });

  socket.on('ring',function(){
    var clientIp = socket.request.connection.remoteAddress;
    console.log('calling from ', clientIp, 'room', room);//, socket.id);
    /*
    if full:
      socket.to(room).emit('full');
    */
    socket.to(room).emit('received');
  });

  socket.on('picked up', function(){
    console.log('B picked!!');
    socket.to(room).emit('picked up');
  });

  socket.on('hangup', function(){
    console.log('received bye');
    caller_in = receiver_in = false;
    socket.to(room).emit('remote hangup');
    socket.leave(room);
  });

  socket.on('message', function(message) {
    console.log('Client',socket.id ,' said: ', message);
    socket.to(room).emit('message', message);
  });

});
