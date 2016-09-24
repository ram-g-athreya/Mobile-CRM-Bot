
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var fields = {
    id: String,
    // Bot Source
    botSource: String,
    date: {
        type: Date,
        default: Date.now
    },
    city: {
        id_city: String,
        city_name: String,
        state_name: String
    },
    currentScenario: {
        // Such as car, bike, usedcar etc
        module: String,
        // Such as price
        action: String,
        // Present step in the process
        step: String,
        // Any additional information required for the scenario
        params: String
    },
    last_notification_time: Date,
    is_subscribed: {type: Boolean, default: false},
    fbData: {
        first_name: String,
        last_name: String,
        profile_pic: String,
        locale: String,
        timezone: String,
        gender: String
    },
    recent: [{
        title: String,
        payload: String
    }]
};

var userSchema = new Schema(fields);

/**
 * Constants
 **/
userSchema.statics.FB_BOT_SOURCE = 'FB Bot';
userSchema.statics.RECENT_LIMIT = 10;

/**
 * Methods
 **/
userSchema.methods.getFirstName = function() {
    switch (this.botSource) {
        case User.FB_BOT_SOURCE:
            return this.fbData.first_name;
    }

    return '';
};

var User = mongoose.model('User', userSchema);
module.exports = User;
