const DEFAULT_CONTROLLER = 'DefaultController';
const SCENARIO_CONTROLLER = 'ScenarioController';

var routes = {
    /**
     *
     * @param controller_type can be DefaultController or ScenarioController
     * @param options
     * @param options.params has action mapping within it for example ["General", "Hi"] => General Controller, Hi Action
     * @param cb
     */
    route: function (controller_type, options, cb) {
        // Routing to appropriate controller
        var controller = require('../app/controllers/' + options.params[0] + '/' + controller_type);
        if (controller) {
            controller.router(options, cb);
        }
    },
    onReceivedMessageText(options, cb) {
        // If we receive a text message, check to see if it matches any special
        // keywords and send back the corresponding example. Otherwise, just echo
        // the text we received.
        var messageText = options.messageText;
        console.log(messageText);
        cb({
            messageType: 'TextMessage',
            result: messageText
        });
    },
    onPostBack: function (options, cb) {
        options.params = options.payload.split("|");
        this.route(DEFAULT_CONTROLLER, options, cb);
    },
    onScenario: function (options, cb) {
        var scenario = options.userData.currentScenario;
        options.params = [scenario.module];
        this.route(SCENARIO_CONTROLLER, options, cb);
    }
};

module.exports = routes;
