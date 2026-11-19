const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, '/')));

let state = {
  queues: [],
  calling: null
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.emit('init-state', state);

  // เพิ่มคิวใหม่ (ใช้รหัสคิวที่เจ้าหน้าที่กรอกเข้ามาโดยตรง)
  socket.on('add-queue', (data) => {
    const newQueue = {
      id: Date.now().toString(),
      code: data.code.toUpperCase(), // แปลงเป็นตัวพิมพ์ใหญ่ให้อัตโนมัติ
      level: data.level,
      hn: data.hn || '',
      name: data.name,
      serviceStatus: data.serviceStatus || 'รอพบแพทย์',
      status: 'waiting',
      time: Date.now(),
      calledCount: 0
    };

    state.queues.push(newQueue);
    io.emit('sync-state', state);
  });

  socket.on('call-queue', (data) => {
    const target = state.queues.find(q => q.id === data.id);
    if (target) {
      target.calledCount = (target.calledCount || 0) + 1;
      target.room = data.room || 'ห้องฉุกเฉิน';
      state.calling = target;
      io.emit('call-queue', target);
      io.emit('sync-state', state);
    }
  });

  socket.on('update-status', (data) => {
    const target = state.queues.find(q => q.id === data.id);
    if (target) {
      target.serviceStatus = data.serviceStatus;
      io.emit('sync-state', state);
    }
  });

  socket.on('finish-queue', (data) => {
    state.queues = state.queues.filter(q => q.id !== data.id);
    if (state.calling && state.calling.id === data.id) {
      state.calling = null;
    }
    io.emit('sync-state', state);
  });

  socket.on('remove-queue', (data) => {
    state.queues = state.queues.filter(q => q.id !== data.id);
    if (state.calling && state.calling.id === data.id) {
      state.calling = null;
    }
    io.emit('sync-state', state);
  });

  socket.on('reset-all', () => {
    state = {
      queues: [],
      calling: null
    };
    io.emit('sync-state', state);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
