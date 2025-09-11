const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

async function createServer(dbFile = 'database.db') {
  const db = await open({ filename: dbFile, driver: sqlite3.Database });
  await db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    surname TEXT,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    password TEXT
  );`);
  await db.exec(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    description TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );`);
  await db.exec(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user INTEGER,
    to_user INTEGER,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(from_user) REFERENCES users(id),
    FOREIGN KEY(to_user) REFERENCES users(id)
  );`);

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.urlencoded({ extended: true }));
  app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));

  function requireLogin(req, res, next) {
    if (!req.session.user) return res.redirect('/login');
    next();
  }

  app.get('/', async (req, res) => {
    const products = await db.all('SELECT products.*, users.name, users.surname FROM products JOIN users ON products.user_id = users.id');
    res.render('index', { user: req.session.user, products });
  });

  app.get('/register', (req, res) => {
    res.render('register');
  });

  app.post('/register', async (req, res) => {
    const { name, surname, email, phone, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    try {
      await db.run('INSERT INTO users (name, surname, email, phone, password) VALUES (?,?,?,?,?)', name, surname, email, phone, hash);
      res.redirect('/login');
    } catch (e) {
      res.status(500).send('User creation failed');
    }
  });

  app.get('/login', (req, res) => {
    res.render('login');
  });

  app.post('/login', async (req, res) => {
    const { identifier, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE email = ? OR phone = ?', identifier, identifier);
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.user = { id: user.id, name: user.name, surname: user.surname };
      res.redirect('/');
    } else {
      res.status(401).send('Login failed');
    }
  });

  app.get('/products/new', requireLogin, (req, res) => {
    res.render('new_product');
  });

  app.post('/products', requireLogin, async (req, res) => {
    const { title, description } = req.body;
    await db.run('INSERT INTO products (user_id, title, description) VALUES (?,?,?)', req.session.user.id, title, description);
    res.redirect('/');
  });

  app.get('/chat/:id', requireLogin, async (req, res) => {
    const other = await db.get('SELECT id, name, surname FROM users WHERE id = ?', req.params.id);
    if (!other) return res.status(404).send('User not found');
    const messages = await db.all('SELECT * FROM messages WHERE (from_user = ? AND to_user = ?) OR (from_user = ? AND to_user = ?) ORDER BY timestamp', req.session.user.id, other.id, other.id, req.session.user.id);
    res.render('chat', { user: req.session.user, other, messages });
  });

  io.on('connection', socket => {
    socket.on('chat message', async msg => {
      const { from, to, content } = msg;
      await db.run('INSERT INTO messages (from_user, to_user, content) VALUES (?,?,?)', from, to, content);
      io.emit('chat message', msg);
    });
  });

  return { app, server, db };
}

if (require.main === module) {
  createServer().then(({ server }) => {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  });
}

module.exports = createServer;
