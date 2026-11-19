const express = require('http');
const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(require('express').static(path.join(__dirname)));

let queueState = {
  date: new Date().toLocaleDateString('sv'),
  seq: 0,
  nid: 0,
  patients: [],
  last: null
};

io.on('connection', (socket) => {
  socket.emit('init-state', queueState);

  socket.on('update-queue', (newState) => {
    queueState = newState;
    io.emit('sync-state', queueState);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
