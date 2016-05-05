import express from 'express';
import socketio from 'socket.io';
import bodyParser from 'body-parser';
import path from 'path';
import models from './models';

// Initialisation

const app = express()
    .use(bodyParser.json())
    .use(express.static(path.join(__dirname, './public')));

app.locals.models = models;

const server = app.listen(9000, () => {
    console.log('Web server ready to use');
});
const io = socketio.listen(server);

// Variables
let informations = [];
let schedules = [];

// Evenements socket.io
io.on('connection', socket => {
    console.log('TV connected');
    socket.emit('informations', informations);
    socket.emit('schedules', schedules);
});

// Initialisation BDD
models.Information.execute().then(cursor => {
    informations = cursor;
});

models.Schedule.execute().then(cursor => {
    schedules = cursor;
});

// Modifications BDD
models.Information.changes().then(feed => {
    updateStoreAndSend('informations', informations, feed);
});

models.Schedule.changes().then(feed => {
    updateStoreAndSend('schedules', schedules, feed);
});

// Fonctions
function updateStoreAndSend(node, store, feed) {
    feed.each((err, doc) => {
        if(err) return;

        if (doc.isSaved() === false) {
            let i = 0;
            for (const o of store) {
                if (o.id === doc.id) {
                    break;
                }

                ++i;
            }

            store.splice(i, 1);
        } else if(doc.getOldValue() == null) {
            store.push(Object.assign({}, doc));
        } else {
            store.forEach((o, i) => {
                if (o.id === doc.id) {
                    store[i] = Object.assign(store[i], doc);
                }
            });
        }

        io.sockets.emit(node, store);
    });
}