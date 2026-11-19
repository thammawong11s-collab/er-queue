const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '.')));

// เก็บสถานะคิวล่าสุดไว้บนเซิร์ฟเวอร์เพื่อให้ทุกเครื่องซิงก์กัน
let queueState = {
  date: new Date().toLocaleDateString('sv'),
  seq: 0,
  nid: 0,
  patients: [],
  last: null
};

io.on('connection', (socket) => {
  // ส่งข้อมูลปัจจุบันให้เครื่องที่เพิ่งเชื่อมต่อเข้ามา
  socket.emit('init-state', queueState);

  // เมื่อมีการเปลี่ยนแปลงข้อมูลคิว (เพิ่ม, เรียกคิว, เสร็จสิ้น)
  socket.on('update-queue', (newState) => {
    queueState = newState;
    // ส่งข้อมูลใหม่ให้ทุกหน้าจอที่เปิดอยู่ทันที
    io.emit('sync-state', queueState);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
