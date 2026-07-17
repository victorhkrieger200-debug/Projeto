import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'atlhon-backend' });
});

app.use('/api/auth', authRoutes);

app.listen(port, () => {
  console.log(`Backend rodando em http://localhost:${port}`);
});
