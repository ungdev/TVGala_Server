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
const p = './';
let informations = [];
let schedules = [];
let censors = [];
let sms = [];

// API
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "POST, GET, DELETE");
    next();
});

app.post('/sms', (req, res) => {
    console.log('SMS received');
    //const receivedSms = Object.assign({}, req.body, { createdAt: new Date()} );
    models.Sms.save({
        message: req.body.message,
        from: req.body.from,
    }).then(result => {
      res.json(result)
      sms.push(result)
    });
    
});
app.get('/sms', (req, res) => {
  res.json(sms);
});

app.delete('/sms/:id', (req, res) => {
  models.Sms.get(req.params.id).run().then(inst => {
      inst.delete();
      res.json(inst);
  });
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
        informations.push(result)
    });
});

app.delete('/information/:id', (req, res) => {
    models.Information.get(req.params.id).run().then(inst => {
        inst.delete();
        res.json(inst);
        const index = informations.findIndex(information => information.id === inst.id)
        informations.slice(index, index + 1)
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

app.get('/censors', (req, res) => {
    res.json(censors);
});

app.post('/censor', (req, res) => {
    const data = req.body;
    models.Censor.save({
        word: data.word
    }).then(result => {
        res.json(result);
        censors.push(result)
    });
});

app.delete('/censor/:id', (req, res) => {
    models.Censor.get(req.params.id).run().then(inst => {
        inst.delete();
        res.json(inst);
        const index = censors.findIndex(censor => censor.id === inst.id)
        censors.slice(index, index + 1)
    });
});

// Evenements socket.io
io.on('connection', socket => {
    console.log('TV connected');
    socket.emit('informations', informations);
    console.log(informations.length)
    socket.emit('schedules', schedules);
    socket.emit('censors', censors);
    socket.emit('sms', sms);
});

// Initialisation BDD
models.Information.execute().then(cursor => {
    informations = cursor;
});

models.Schedule.execute().then(cursor => {
    schedules = cursor;
});

models.Censor.execute().then(cursor => {
    censors = cursor;
});

models.Sms.execute().then(cursor => {
  sms = cursor;
});

// Modifications BDD
models.Information.changes().then(feed => {
    updateStoreAndSend('informations', informations, feed);
});

models.Schedule.changes().then(feed => {
    updateStoreAndSend('schedules', schedules, feed);
});

models.Censor.changes().then(feed => {
    updateStoreAndSend('censors', censors, feed);
});

models.Sms.changes().then(feed => {
  updateStoreAndSend('sms', sms, feed);
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
        console.log('EMIT on', node)
    });
}
