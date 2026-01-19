import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import healthRoutes from './routes/healthRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/health', healthRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
