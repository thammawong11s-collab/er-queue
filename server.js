const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

let queueState = {
  currentCalling: null, // คิวที่กำลังเรียกปัจจุบัน
  waitingList: [],      // รายการคิวรอ
  history: []           // ประวัติย้อนหลัง
};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.emit('updateQueue', queueState);

  // เจ้าหน้าที่เรียกคิว
  socket.on('callQueue', (queueData) => {
    if (queueState.currentCalling) {
      queueState.history.unshift(queueState.currentCalling);
      if (queueState.history.length > 10) queueState.history.pop();
    }
    queueState.currentCalling = queueData;
    io.emit('updateQueue', queueState);
  });

  // เคลียร์คิว
  socket.on('clearQueue', () => {
    if (queueState.currentCalling) {
      queueState.history.unshift(queueState.currentCalling);
    }
    queueState.currentCalling = null;
    io.emit('updateQueue', queueState);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
