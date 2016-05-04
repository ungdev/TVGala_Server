import fs from 'fs';
import thinky from '../thinky';
import path from 'path';

const models = {
    r: thinky.r
};

fs
    .readdirSync(`${path.join(__dirname, '..')}/models/`)
    .filter(file => file.slice(-3) === '.js')
    .filter(file => file !== 'index.js')
    .forEach(file => {
        const model = require(`${path.join(__dirname, '..')}/models/${file}`).default;
        models[model.getTableName()] = model;
    });

let modelsLoaded = 0;

Object.keys(models).forEach((modelName, i, arr) => {
    if (modelName === 'r') {
        return;
    }
    
    models[modelName].associate(models);

    models[modelName].on('ready', () => {
        ++modelsLoaded;
        console.log(`Model ${modelName} ready`);

        if (modelsLoaded === arr.length - 1) {
            console.log('Models ready');

            if (models.onReady) {
                models.onReady();
            }
        }
    });
});

export default models;