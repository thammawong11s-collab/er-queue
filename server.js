const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

let queueData = {
  currentCalling: null,
  queueList: []
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.emit('syncState', queueData);

  // ออกคิวใหม่
  socket.on('addQueue', (patient) => {
    const newPatient = {
      id: Date.now(),
      queueNo: patient.queueNo,
      fullName: patient.fullName,
      level: patient.level, // red, pink, yellow, green, white
      room: patient.room,
      treatmentStatus: patient.treatmentStatus,
      status: 'รอพบแพทย์',
      timeIn: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    };
    
    queueData.queueList.push(newPatient);
    io.emit('syncState', queueData);
  });

  // เรียกคิวถัดไปตามความเร่งด่วน (แดง -> ชมพู -> เหลือง -> เขียว -> ขาว)
  socket.on('callNext', (room) => {
    const priorityOrder = { red: 1, pink: 2, yellow: 3, green: 4, white: 5 };
    
    const waitingCases = queueData.queueList
      .filter(p => p.status === 'รอพบแพทย์' || p.status === 'เรียกซ้ำ')
      .sort((a, b) => priorityOrder[a.level] - priorityOrder[b.level]);

    if (waitingCases.length > 0) {
      const nextPatient = waitingCases[0];
      nextPatient.status = 'กำลังเรียก';
      nextPatient.room = room;
      queueData.currentCalling = nextPatient;
      io.emit('syncState', queueData);
    }
  });

  // อัปเดตข้อมูลผู้ป่วยรายเคส (เปลี่ยนสถานะ, Re-triage ระดับความฉุกเฉิน, เรียกซ้ำ, เสร็จสิ้น)
  socket.on('actionPatient', ({ id, action, value }) => {
    const target = queueData.queueList.find(p => p.id === id);
    if (!target) return;

    if (action === 'callAgain') {
      target.status = 'กำลังเรียก';
      queueData.currentCalling = target;
    } else if (action === 'updateTreatmentStatus') {
      target.treatmentStatus = value;
    } else if (action === 'updateLevel') {
      target.level = value; // Re-triage เปลี่ยนระดับความฉุกเฉิน
      // ถ้าเคสนี้กำลังเรียกอยู่บนจอ ให้ sync ข้อมูล currentCalling ด้วย
      if (queueData.currentCalling && queueData.currentCalling.id === id) {
        queueData.currentCalling.level = value;
      }
    } else if (action === 'finish') {
      target.status = 'เสร็จสิ้น';
      target.treatmentStatus = 'จำหน่ายกลับบ้าน';
      if (queueData.currentCalling && queueData.currentCalling.id === id) {
        queueData.currentCalling = null;
      }
    }
    io.emit('syncState', queueData);
  });

  // ล้างข้อมูลทั้งหมด
  socket.on('resetAll', () => {
    queueData = { currentCalling: null, queueList: [] };
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
