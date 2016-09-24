/**
 * BaseRequest
 * Wrapper around NPM request module which is used for all backend calls with CarAndBike
 * @module app/components/BaseRequest
 */

var request = require('request');
var config = require(process.env.DIR + '/config');

/**
 * This is written as a promise which returns JSON data in case of success or renders the fallback template in case of failure
 *
 * @param options
 * @param options.url Backend URL
 * @param options.method Optional defaults to GET
 * @param options.qs Optional query string
 * @param options.form Optional post parameters
 * @param options.onError Error callback when server response in 4XX and 5XX. This is basically a callback to FB messenger to display the fallback template since the request failed
 *
 * @returns {Promise}
 */
module.exports = (options) => {
    return new Promise((resolve, reject) => {
        var params = {
            url: process.env.BASE_URL + options.url,
            method: options.method ? options.method : 'GET',
            timeout: 10000
        };

        /** In case of authentication which is required in stage */
        if (process.env.AUTH_USERNAME) {
            params.auth = {
                user: process.env.AUTH_USERNAME,
                pass: process.env.AUTH_PASSWORD
            };
        }

        /** Setting Query String - Version number is set with every request */
        params.qs = options.qs ? options.qs : {};
        // Adding version number as part of every request
        params.qs.version = config.VERSION;

        /** Setting POST parameters if it exists */
        if (options.form) {
            params.form = options.form;
        }

        request(params, (error, response, body) => {
            if (error) {
                console.log(error);
            }

            /** When server returns a response call resolve callback */
            if (!error && response.statusCode === 200) {
                resolve(JSON.parse(body));
            }
            /** This is fallback in case the response from server is 4XX or 5XX. Basically not 200. In ideal scenario this should never happen */
            else {
                console.log(error, response);
                if (options.onError) {
                    var general = require(process.env.DIR + '/app/components/General');
                    general.fallback(options.onError);
                }
                reject();
            }
        });
    });
};
