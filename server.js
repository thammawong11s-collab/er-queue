const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ให้บริการไฟล์ HTML และ Static ต่างๆ ในโฟลเดอร์เดียวกัน
app.use(express.static(__dirname));

let currentData = {
  date: new Date().toLocaleDateString('sv'),
  seq: 0,
  nid: 0,
  patients: [],
  last: null
};

wss.on('connection', (ws) => {
  // ส่งข้อมูลปัจจุบันให้เครื่องที่เพิ่งเชื่อมต่อเข้ามาทันที
  ws.send(JSON.stringify({ type: 'INIT', data: currentData }));

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      if (msg.type === 'UPDATE') {
        currentData = msg.data;
        // Broadcast (กระจายข้อมูลใหม่ไปยังทุกเครื่องที่เปิดอยู่ทันที)
        wss.clients.forEach((client) => {
          if (client.readyState === client.OPEN) {
            client.send(JSON.stringify({ type: 'SYNC', data: currentData }));
          }
        });
      }
    } catch (e) {
      console.error('Invalid message', e);
    }
  });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ระบบคิวพร้อมใช้งานที่: http://localhost:${PORT}`);
  console.log(`📺 เปิดจอทีวีผ่านไอพีวงแลน เช่น: http://<IP-เครื่องนี้>:3000/#board`);
});