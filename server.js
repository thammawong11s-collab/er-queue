const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, '/')));

// เก็บข้อมูลคิวในหน่วยความจำ
let state = {
  queues: [],
  calling: null,
  counters: { red: 0, pink: 0, yellow: 0, green: 0, white: 0 }
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // ส่งข้อมูลปัจจุบันให้ผู้ใช้ใหม่ทันที
  socket.emit('init-state', state);

  // เพิ่มคิวใหม่
  socket.on('add-queue', (data) => {
    state.counters[data.level] = (state.counters[data.level] || 0) + 1;
    const prefixMap = { red: 'R', pink: 'P', yellow: 'Y', green: 'G', white: 'W' };
    const code = `${prefixMap[data.level] || 'X'}${String(state.counters[data.level]).padStart(2, '0')}`;

    const newQueue = {
      id: Date.now().toString(),
      code: code,
      level: data.level,
      hn: data.hn || '',
      name: data.name,
      serviceStatus: data.serviceStatus || 'รอพบแพทย์',
      status: 'waiting', // waiting, finished
      time: Date.now(),
      calledCount: 0
    };

    state.queues.push(newQueue);
    io.emit('sync-state', state);
  });

  // เรียกคิว
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

  // อัปเดตสถานะการรับบริการ
  socket.on('update-status', (data) => {
    const target = state.queues.find(q => q.id === data.id);
    if (target) {
      target.serviceStatus = data.serviceStatus;
      io.emit('sync-state', state);
    }
  });

  // จบการบริการ (เอาออกจากหน้าจอแสดงผลหลัก)
  socket.on('finish-queue', (data) => {
    state.queues = state.queues.filter(q => q.id !== data.id);
    if (state.calling && state.calling.id === data.id) {
      state.calling = null;
    }
    io.emit('sync-state', state);
  });

  // ลบคิว
  socket.on('remove-queue', (data) => {
    state.queues = state.queues.filter(q => q.id !== data.id);
    if (state.calling && state.calling.id === data.id) {
      state.calling = null;
    }
    io.emit('sync-state', state);
  });

  // ล้างข้อมูลทั้งหมด
  socket.on('reset-all', () => {
    state = {
      queues: [],
      calling: null,
      counters: { red: 0, pink: 0, yellow: 0, green: 0, white: 0 }
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
