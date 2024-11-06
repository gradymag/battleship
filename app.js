const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const router = require('./router');
//const services = require('./services');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//
//app.use(express.static(path.join(__dirname, '../client')));


app.use(router);


const services = require('./services.js');
services(app);


const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
