const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, '/')));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // ส่งข้อมูลเริ่มต้นให้ Client ทันทีที่เชื่อมต่อ
  socket.emit('init-state', { queues: [] });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
