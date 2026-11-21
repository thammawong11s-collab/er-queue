const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

// State ของระบบคิว
let queueData = {
  currentCalling: null, // เคสที่กำลังเรียกหน้าจอ
  queueList: [],        // รายการคิวทั้งหมด
  counter: 480          // รันเลขคิวเริ่มต้น
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.emit('syncState', queueData);

  // ออกคิวใหม่
  socket.on('addQueue', (patient) => {
    queueData.counter += 1;
    const newPatient = {
      id: Date.now(),
      queueNo: queueData.counter,
      firstName: patient.firstName,
      lastName: patient.lastName,
      maskedName: `${patient.firstName} ${patient.lastName.substring(0, 3)}***`,
      level: patient.level, // red, pink, yellow, green, white
      levelName: patient.levelName,
      room: patient.room,
      status: 'รอเรียก', // รอเรียก, กำลังเรียก, เสร็จสิ้น
      timeIn: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    };
    queueData.queueList.push(newPatient);
    io.emit('syncState', queueData);
  });

  // เรียกคิวถัดไป (ตามความเร่งด่วน: แดง -> ชมพู -> เหลือง -> เขียว -> ขาว)
  socket.on('callNext', (room) => {
    const priorityOrder = { red: 1, pink: 2, yellow: 3, green: 4, white: 5 };
    
    // กหาคิวที่ยังไม่เสร็จ เรียงตามความสำคัญ
    const waitingCases = queueData.queueList
      .filter(p => p.status === 'รอเรียก' || p.status === 'เรียกซ้ำ')
      .sort((a, b) => priorityOrder[a.level] - priorityOrder[b.level]);

    if (waitingCases.length > 0) {
      const nextPatient = waitingCases[0];
      nextPatient.status = 'กำลังเรียก';
      nextPatient.room = room;
      queueData.currentCalling = nextPatient;
      io.emit('syncState', queueData);
    }
  });

  // เรียกซ้ำ / อัปเดตสถานะเฉพาะเคส
  socket.on('actionPatient', ({ id, action }) => {
    const target = queueData.queueList.find(p => p.id === id);
    if (!target) return;

    if (action === 'callAgain') {
      target.status = 'กำลังเรียก';
      queueData.currentCalling = target;
    } else if (action === 'finish') {
      target.status = 'เสร็จสิ้น';
      if (queueData.currentCalling && queueData.currentCalling.id === id) {
        queueData.currentCalling = null;
      }
    }
    io.emit('syncState', queueData);
  });

  // ล้างข้อมูลทั้งหมด
  socket.on('resetAll', () => {
    queueData = { currentCalling: null, queueList: [], counter: 480 };
    io.emit('syncState', queueData);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
