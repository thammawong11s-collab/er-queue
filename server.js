const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// เปิดให้ใช้งานไฟล์ static ในโฟลเดอร์ปัจจุบัน
app.use(express.static(path.join(__dirname)));

// เก็บข้อมูลคิวและห้องตรวจ
let queueState = {
  currentCalling: null, // คิวที่กำลังเรียก
  waitingList: [],      // คิวรอเรียก
  history: []           // ประวัติการเรียกคิว
};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // ส่งข้อมูลคิวปัจจุบันให้ผู้ใช้ใหม่ทันทีที่เชื่อมต่อ
  socket.emit('updateQueue', queueState);

  // เมื่อเจ้าหน้าที่เรียกคิวถัดไป
  socket.on('callQueue', (queueData) => {
    if (queueState.currentCalling) {
      queueState.history.unshift(queueState.currentCalling);
      if (queueState.history.length > 10) queueState.history.pop(); // เก็บประวัติล่าสุด 10 คิว
    }
    queueState.currentCalling = queueData;
    io.emit('updateQueue', queueState);
  });

  // เมื่อเจ้าหน้าที่เคลียร์คิวปัจจุบัน
  socket.on('clearQueue', () => {
    if (queueState.currentCalling) {
      queueState.history.unshift(queueState.currentCalling);
    }
    queueState.currentCalling = null;
    io.emit('updateQueue', queueState);
  });

  // เมื่อเพิ่มคิวใหม่
  socket.on('addQueue', (queueData) => {
    queueState.waitingList.push(queueData);
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
