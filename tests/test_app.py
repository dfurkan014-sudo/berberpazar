import os, sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import pytest
from app import app, db, User, Listing, Message

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
        yield client
        with app.app_context():
            db.drop_all()

def register(client):
    return client.post('/register', data={
        'first_name': 'Ali',
        'last_name': 'Veli',
        'email': 'ali@example.com',
        'phone': '1234567890',
        'password': 'password'
    }, follow_redirects=True)

def login(client, identifier, password):
    return client.post('/login', data={'identifier': identifier, 'password': password}, follow_redirects=True)

def test_register_login_and_listing(client):
    rv = register(client)
    assert b'Registration successful' in rv.data
    rv = login(client, 'ali@example.com', 'password')
    assert b'Logout' in rv.data
    rv = client.post('/create_listing', data={'title': 'Phone', 'description': 'Nice phone'}, follow_redirects=True)
    assert b'Phone' in rv.data

def test_chat(client):
    register(client)
    login(client, 'ali@example.com', 'password')
    # create second user
    client.post('/register', data={
        'first_name': 'Ayse',
        'last_name': 'Fatma',
        'email': 'ayse@example.com',
        'phone': '0987654321',
        'password': 'secret'
    }, follow_redirects=True)
    # send message from Ali to Ayse
    rv = client.post('/chat/2', data={'content': 'Hello Ayse'}, follow_redirects=True)
    assert b'Hello Ayse' in rv.data
