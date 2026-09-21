const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDB } = require('./db');
const authRoutes = require('./routes/auth');
const folderRoutes = require('./routes/folders');
const mediaRoutes = require('./routes/media');
const playlistRoutes = require('./routes/playlists');
const tvRoutes = require('./routes/tvs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Attach Socket.io to request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve Vite frontend build statically in production
app.use(express.static(path.join(__dirname, '../dist')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/tvs', tvRoutes);

// Socket.io Connection logic
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join_tv_room', ({ slug }) => {
    if (slug) {
      const room = `tv:${slug}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Global Error Handler (handles multer errors and runtime exceptions gracefully)
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// SPA Fallback for React routes
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  const distIndex = path.join(__dirname, '../dist/index.html');
  const srcIndex = path.join(__dirname, '../index.html');
  res.sendFile(require('fs').existsSync(distIndex) ? distIndex : srcIndex);
});

// Initialize DB and start server
async function startServer() {
  try {
    await initDB();
    server.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(`  Thoen Media TV System Running on Port ${PORT}   `);
      console.log(`  Admin URL: http://localhost:${PORT}/           `);
      console.log(`  TV Client: http://localhost:${PORT}/tv/:slug    `);
      console.log(`=================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
