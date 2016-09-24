/**
 * User
 * Component used for managing User Data throughout the app
 * @module app/components/User
 */

var request = require('request');
var UserModel = require(process.env.DIR + '/app/models/UserModel');

/**
 * Presently used in platform for setting FB User can be scaled to other scenarios
 * @param options
 * @param options.id
 * @param options.botSource
 * @param cb
 */
function insertUser(options, cb) {
    getUserInfo(options, function (data) {
        /** Create new document */
        var user = new UserModel(data);
        user.save(function (err, user_data) {
            if (err) {
                throw err;
            }
            console.log("User Created: ", user_data.id);
            cb(user_data);
        });
    });
}

/**
 *
 * @param options
 * Options can be senderID & Bot Source depending on which corresponding bot function gets called for data
 */
function getUserInfo(options, cb) {
    switch (options.botSource) {
        case UserModel.FB_BOT_SOURCE:
            // Get FB Specifc Data through API
            getFBUserInfo(options.id, function (response) {
                options.fbData = response;
                cb(options);
            });
            break;
        default:
            cb(options);
    }
}

/**
 *
 * @param userId
 * @param cb
 */
function getFBUserInfo(userId, cb) {
    request({
        uri: 'https://graph.facebook.com/v2.6/' + userId,
        qs: {
            fields: 'first_name,last_name,profile_pic,timezone,locale,gender',
            access_token: process.env.FB_PAGE_ACCESS_TOKEN
        },
        method: 'GET'
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            if (cb) {
                cb(JSON.parse(body));
            }
        } else {
            console.log("Unable to get User Data from FB");
            console.error(response);
            console.error(error);
        }
    });
}

/**
 * Presently used in platform for setting FB User can be scaled to other scenarios
 * @param options
 * @param options.id
 * @param options.botSource
 * @param cb
 */
module.exports = {
    getUser (options, cb) {
        console.log('User ID is ' + options.id);
        var data = {
            id: options.id,
            botSource: options.botSource
        };

        UserModel.findOne(data, (err, user_data) => {
            if (err) {
                throw err;
            }

            /** If user already exists then return with data from DB */
            if (user_data) {
                cb(user_data);
            }
            /** Otherwise create a new user */
            else {
                insertUser(data, function (user_data) {
                    cb(user_data);
                });
            }
        });
    }
};