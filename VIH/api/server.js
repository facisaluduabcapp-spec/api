// server.js
import 'dotenv/config'; // Esto es más rápido y seguro en ES Modules
import express from 'express';
import cors from 'cors';

// Importa los handlers normalmente (la protección ahora estará dentro de ellos)
import createAdmin from './created-admin.js';
import deleteUser from './delete-user.js';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.post('/api/create-admin', createAdmin);
app.post('/api/delete-user', deleteUser);

app.listen(3000, () => console.log('✅ API local en http://localhost:3000'));