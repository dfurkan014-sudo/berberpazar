const request = require('supertest');
const createServer = require('./server');

let app, server, db;

beforeAll(async () => {
  ({ app, server, db } = await createServer(':memory:'));
});

afterAll(async () => {
  await db.close();
  server.close();
});

test('user registration, login and product creation', async () => {
  const agent = request.agent(app);
  await agent
    .post('/register')
    .type('form')
    .send({ name: 'Ali', surname: 'Veli', email: 'ali@example.com', phone: '555', password: '1234' })
    .expect(302);

  await agent
    .post('/login')
    .type('form')
    .send({ identifier: 'ali@example.com', password: '1234' })
    .expect(302);

  await agent
    .post('/products')
    .type('form')
    .send({ title: 'Telefon', description: 'Sıfır ayarında' })
    .expect(302);

  const res = await agent.get('/');
  expect(res.text).toContain('Telefon');
});
