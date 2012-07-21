var app = require('express').createServer()
  , io = require('socket.io').listen(app);

app.listen(8000);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.get('/main.js', function (req, res) {
  res.sendfile(__dirname + '/main.js');
});

var first = true;

io.sockets.on('connection', function (socket) {
  if (first) {
    first = false;
  } else {
    socket.emit('become initiator');
  }
  socket.emit('channel opened');
  socket.on('ice candidate', function(data) {
    console.log("ice candidate received");
    socket.broadcast.emit('receive ice candidate', data);
  });
  socket.on('send offer', function(data) {
    console.log("offer received");
    socket.broadcast.emit('receive offer', data);
  });
  socket.on('send answer', function(data) {
    console.log("answer received");
    socket.broadcast.emit('receive answer', data);
  });
});
