// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

// connect DB
connectDB(process.env.MONGO_URI);

// simple health check
app.get('/', (req, res) => res.send({ ok: true, message: 'Adaptive elearn backend API' }));

// routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/lessons', require('./routes/lessons'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/attempts', require('./routes/attempts'));
// server.js - snippet to insert (exact)
app.use('/api/attempts-debug', require('./routes/attempts.debug'));
app.use('/api/gamification', require('./routes/gamification'));

// start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
