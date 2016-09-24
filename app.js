// Including environment configurations
require('dotenv').config();

var bodyParser = require('body-parser'),
    express = require('express');

require('./db');

// Setting DIR globally so that it can be accessed across the application
process.env.DIR = __dirname;

var app = express();
var routes = require('./routes/routes');

app.set('port', process.env.PORT || 5000);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static(__dirname + '/public'));
app.use('/output', express.static(__dirname + '/output'));

// Setting Web Routers
require('./routes/web')(app);

app.listen(app.get('port'), () => {
    console.log('Node app is running on port', app.get('port'));
    var fb = require('./platforms/fb');
    fb.init({
        app: app,
        routes: routes
    });
    fb.setThreadSettings();
});

module.exports = app;