// Connect to MongoDB2 database

if (process.env.ENV !== 'heroku') {
    require('mongoose').connect(process.env.DB_CONNECTION_STRING);
} else {
    require('mongoose').connect(process.env.MONGODB_URI);
}
