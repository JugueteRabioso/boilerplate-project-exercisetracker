const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb'); // Importa ObjectId desde mongodb


// Middleware para analizar el cuerpo de las solicitudes
app.use(express.json()); // Para analizar JSON
app.use(express.urlencoded({ extended: true })); // Para analizar datos de formularios

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

console.log('Hello World');

//Conexión a la base de datos

const client = new MongoClient(process.env.DB_URI);
const db = client.db('exerciseTracker'); // Nombre de la base de datos
const users = db.collection('users'); // Nombre de la colección



// Conectar al cliente
async function connect() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
  }
}
connect();
console.log('DB_URI:', process.env.DB_URI);


// Crear usuario

app.post('/api/users', async (req, res) => {
  const { username } = req.body; // Obtiene el nombre de usuario del cuerpo de la solicitud

  if (!username) {
    return res.status(400).json({ error: 'Username es requerido' });
  }

  try {
    // Crea un nuevo usuario con un ID único
    const newUser = {
      username,
      _id: new ObjectId(), // Genera un ObjectId único
    };

    // Inserta el usuario en la colección "users"
    const result = await users.insertOne(newUser);

    // Devuelve el usuario creado
    res.json({
      username: newUser.username,
      _id: newUser._id,
    });
  } catch (err) {
    console.error('Error creando usuario:', err);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
});

// Obtener usuarios
app.get('/api/users', async (req, res) => {
  try {
    const userList = await users.find({}, { projection: { username: 1, _id: 1 } }).toArray();
    res.json(userList);
  } catch (err) {
    console.error('Error obteniendo usuarios:', err);
    res.status(500).json({ error: 'Error al obtener los usuarios' });
  }
});



// Agregar ejercicio a un usuario
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  try {
    const user = await users.findOne({ _id: new ObjectId(_id) });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const exercise = {
      description,
      duration: Number(duration),
      date: date ? new Date(date).toDateString() : new Date().toDateString(),
    };

    // Actualiza el usuario agregando el ejercicio
    await users.updateOne(
      { _id: new ObjectId(_id) },
      { $push: { exercises: exercise } }
    );

    res.json({
      username: user.username,
      _id: user._id,
      ...exercise,
    });
  } catch (err) {
    console.error('Error agregando ejercicio:', err);
    res.status(500).json({ error: 'Error al agregar el ejercicio' });
  }
});

// Obtener log de ejercicios de un usuario
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await users.findOne({ _id: new ObjectId(_id) });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    let log = user.exercises || [];

    // Filtra por fecha si se proporciona "from" o "to"
    if (from) log = log.filter(ex => new Date(ex.date) >= new Date(from));
    if (to) log = log.filter(ex => new Date(ex.date) <= new Date(to));

    // Limita la cantidad de ejercicios si se proporciona "limit"
    if (limit) log = log.slice(0, Number(limit));

    res.json({
      username: user.username,
      _id: user._id,
      count: log.length,
      log,
    });
  } catch (err) {
    console.error('Error obteniendo log:', err);
    res.status(500).json({ error: 'Error al obtener el log' });
  }
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
