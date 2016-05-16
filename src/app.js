import express from 'express';
import socketio from 'socket.io';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import models from './models';

// Initialisation
const app = express()
    .use(bodyParser.json())
    .use(express.static(path.join(__dirname, '../src/public')));

app.locals.models = models;

const server = app.listen(9000, () => {
    console.log('Web server ready to use');
});
const io = socketio.listen(server);

// Variables*
const p = './src/public/images/';
let informations = [];
let schedules = [];
let images = [];

// API
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "POST, GET, DELETE");
    next();
});

app.post('/sms', (req, res) => {
    console.log('SMS received');
    const receivedSms = Object.assign({}, req.body, {time: new Date()});
    models.Sms.save({
        content: receivedSms.message,
        from: receivedSms.from
    });
    io.sockets.emit('sms', receivedSms);
    res.end(JSON.stringify(receivedSms, null, 2));
});

app.get('/informations', (req, res) => {
    res.json(informations);
});

app.post('/information', (req, res) => {
    const data = req.body;
    models.Information.save({
        message: data.message
    }).then(result => {
        res.json(result);
    });
});

app.delete('/information/:id', (req, res) => {
    models.Information.get(req.params.id).run().then(inst => {
        inst.delete();
        res.json(inst);
    });
});

app.get('/schedules', (req, res) => {
    res.json(schedules);
});

app.post('/schedule', (req, res) => {
    const data = req.body;
    models.Schedule.save({
        name: data.name,
        location: data.location,
        start: data.start,
        end: data.end
    }).then(result => {
        res.json(result);
    });
});

app.delete('/schedule/:id', (req, res) => {
    models.Schedule.get(req.params.id).run().then(inst => {
        inst.delete();
        res.json(inst);
    });
});

// Evenements socket.io
io.on('connection', socket => {
    console.log('TV connected');
    socket.emit('informations', informations);
    socket.emit('schedules', schedules);
    socket.emit('images', images);
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

// Modifications directory
fs.watch(p, (event, filename) => {
    if(event == 'rename') {
        imagesFilesAndSend(p);
    }
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

function imagesFilesAndSend(directory) {
    fs.readdir(p, (err, files) => {
        if (err) {
            throw err;
        }
        images = files;
        io.sockets.emit('images', images);
    });
}

// Premier chargement
imagesFilesAndSend(p);