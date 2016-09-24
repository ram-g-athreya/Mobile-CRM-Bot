'use strict';

// FB Messenger Platform Related Code

var request = require('request');

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = process.env.FB_APP_SECRET;

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = process.env.FB_VALIDATION_TOKEN;

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.FB_PAGE_ACCESS_TOKEN);

var fb = {
    init: function (options) {
        var me = this;

        function dispatchMessage(messagingEvent) {
            var senderID = messagingEvent.sender.id;

            function handleMessage(cb) {
                var UserModel = require(process.env.DIR + '/app/models/UserModel');
                var User = require(process.env.DIR + '/app/components/User');
                User.getUser({
                    id: senderID,
                    botSource: UserModel.FB_BOT_SOURCE
                }, function (user_data) {
                    cb(messagingEvent, user_data);
                });
            }

            if (messagingEvent.optin) {
                receivedAuthentication(messagingEvent);
            } else if (messagingEvent.delivery) {
                receivedDeliveryConfirmation(messagingEvent);
            } else if (messagingEvent.message && messagingEvent.message.is_echo) {
                // Echo Event Safely Ignore
                console.log('Echo Occurred: ', messagingEvent);
            } else if (messagingEvent.message && messagingEvent.message.quick_reply) {
                handleMessage(receivedPostback);
            } else if (messagingEvent.message) {
                handleMessage(receivedMessage);
            } else if (messagingEvent.postback) {
                handleMessage(receivedPostback);
            } else {
                console.log("Webhook received unknown messagingEvent: ", messagingEvent);
            }
        }

        /*
         * Authorization Event
         *
         * The value for 'optin.ref' is defined in the entry point. For the "Send to
         * Messenger" plugin, it is the 'data-ref' field. Read more at
         * https://developers.facebook.com/docs/messenger-platform/webhook-reference#auth
         *
         */
        function receivedAuthentication(event) {
            var senderID = event.sender.id;
            var recipientID = event.recipient.id;
            var timeOfAuth = event.timestamp;

            // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
            // The developer can set this to an arbitrary value to associate the
            // authentication callback with the 'Send to Messenger' click event. This is
            // a way to do account linking when the user clicks the 'Send to Messenger'
            // plugin.
            var passThroughParam = event.optin.ref;

            console.log("Received authentication for user %d and page %d with pass " +
                "through param '%s' at %d", senderID, recipientID, passThroughParam,
                timeOfAuth);

            // When an authentication is received, we'll send a message back to the sender
            // to let them know it was successful.
            sendTextMessage(senderID, "Authentication successful");
        }


        /*
         * Message Event
         *
         * This event is called when a message is sent to your page. The 'message'
         * object format can vary depending on the kind of message that was received.
         * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference#received_message
         *
         * For this example, we're going to echo any text that we get. If we get some
         * special keywords ('button', 'generic', 'receipt'), then we'll send back
         * examples of those bubbles to illustrate the special message bubbles we've
         * created. If we receive a message with an attachment (image, video, audio),
         * then we'll simply confirm that we've received the attachment.
         *
         */
        function receivedMessage(event, userData) {
            console.log(event, userData);

            var senderID = event.sender.id;
            var recipientID = event.recipient.id;
            var timeOfMessage = event.timestamp;
            var message = event.message;

            console.log(event.sender);

            console.log("Received message for user %d and page %d at %d with message:",
                senderID, recipientID, timeOfMessage);
            console.log(JSON.stringify(message));

            var messageId = message.mid;

            // You may get a text or attachment but not both
            var messageText = message.text;
            var messageAttachments = message.attachments;

            if (messageText) {
                setSenderAction(senderID, 'mark_seen');
                setSenderAction(senderID, 'typing_on');
                options.routes.onReceivedMessageText({
                    userData: userData,
                    messageType: 'TypedMessage',
                    messageText: messageText
                }, function (response, cb) {
                    handleResponse(senderID, response, cb);
                });
            } else if (messageAttachments) {
                // sendTextMessage(senderID, "Message with attachment received");
            }
        }

        /*
         * Postback Event
         *
         * This event is called when a postback is tapped on a Structured Message. Read
         * more at https://developers.facebook.com/docs/messenger-platform/webhook-reference#postback
         *
         */
        function receivedPostback(event, userData) {
            var senderID = event.sender.id;
            var recipientID = event.recipient.id;
            var timeOfPostback = event.timestamp;

            // The 'payload' param is a developer-defined field which is set in a postback
            // button for Structured Messages.
            var payload = (event.postback) ? event.postback.payload : event.message.quick_reply.payload;

            console.log("Received postback for user %d and page %d with payload '%s' " +
                "at %d", senderID, recipientID, payload, timeOfPostback);

            // When a postback is called, we'll send a message back to the sender to
            // let them know it was successful

            setSenderAction(senderID, 'mark_seen');
            setSenderAction(senderID, 'typing_on');
            options.routes.onPostBack({
                app: options.app,
                userData: userData,
                messageType: 'PostbackMessage',
                payload: payload
            }, function (response, cb) {
                handleResponse(senderID, response, cb);
            });
        }

        /*
         * Delivery Confirmation Event
         *
         * This event is sent to confirm the delivery of a message. Read more about
         * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference#message_delivery
         *
         */
        function receivedDeliveryConfirmation(event) {
            var senderID = event.sender.id;
            var recipientID = event.recipient.id;
            var delivery = event.delivery;
            var messageIDs = delivery.mids;
            var watermark = delivery.watermark;
            var sequenceNumber = delivery.seq;

            if (messageIDs) {
                messageIDs.forEach(function (messageID) {
                    console.log("Received delivery confirmation for message ID: %s",
                        messageID);
                });
            }
            console.log("All message before %d were delivered.", watermark);
        }

        function handleResponse(senderID, response, cb) {
            setSenderAction(senderID, 'typing_off');
            switch (response.messageType) {
                case "TextMessage":
                    me.sendTextMessage(senderID, response.result, cb);
                    break;
                case "GenericMessage":
                    me.sendGenericMessage(senderID, response.result, cb);
                    break;
                case "ButtonMessage":
                    me.sendButtonMessage(senderID, response.result, cb);
                    break;
                case "QuickRepliesMessage":
                    me.sendQuickRepliesMessage(senderID, response.result, cb);
                    break;
                case "VideoMessage":
                    me.sendVideoMessage(senderID, response.result, cb);
                    break;
                case "ImageMessage":
                    me.sendImageMessage(senderID, response.result, cb);
                    break;
            }
        }

        function setSenderAction(recipientId, senderAction) {
            request({
                uri: 'https://graph.facebook.com/v2.6/me/messages',
                qs: {
                    access_token: PAGE_ACCESS_TOKEN
                },
                method: 'POST',
                json: {
                    recipient: {
                        id: recipientId
                    },
                    sender_action: senderAction
                }
            }, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var recipientId = body.recipient_id;
                    var messageId = body.message_id;

                } else {
                    console.error("Unable to send message.");
                    console.error(response);
                    console.error(error);
                }
            });
        }

        // FB WebHook Get Request, used for validating WebHook
        options.app.get('/fbwebhook', function (req, res) {
            if (req.query['hub.mode'] === 'subscribe' &&
                req.query['hub.verify_token'] === VALIDATION_TOKEN) {
                console.log("Validating webhook");
                res.status(200).send(req.query['hub.challenge']);
            } else {
                console.error("Failed validation. Make sure the validation tokens match.");
                res.sendStatus(403);
            }
        });

        // FB WebHook used for handling all other messages
        options.app.post('/fbwebhook', function (req, res) {
            var data = req.body;

            // Make sure this is a page subscription
            if (data.object == 'page') {
                // Iterate over each entry
                // There may be multiple if batched
                data.entry.forEach(function (pageEntry) {
                    var pageID = pageEntry.id;
                    var timeOfEvent = pageEntry.time;

                    // Iterate over each messaging event
                    pageEntry.messaging.forEach(function (messagingEvent) {
                        dispatchMessage(messagingEvent);
                    });
                });

                // Assume all went well.
                //
                // You must send back a 200, within 20 seconds, to let us know you've
                // successfully received the callback. Otherwise, the request will time out.
                res.sendStatus(200);
            }
        });
    },
    setThreadSettings: function () {
        function setThreadSetting(json) {
            request({
                uri: 'https://graph.facebook.com/v2.6/me/thread_settings',
                qs: {
                    access_token: PAGE_ACCESS_TOKEN
                },
                method: 'POST',
                json: json
            }, function (error, response, body) {
                if (!error && response.statusCode == 200) {

                } else {
                    console.error("Unable to send message.");
                    console.error(response);
                    console.error(error);
                }
            });
        }

        function setMenu() {
            setThreadSetting({
                setting_type: "call_to_actions",
                thread_state: "existing_thread",
                call_to_actions: [{
                    "type": "postback",
                    "title": "Start Over",
                    "payload": "General|Hi"
                }, {
                    "type": "postback",
                    "title": "Cars",
                    "payload": "General|CarMenu"
                }, {
                    "type": "postback",
                    "title": "Bikes",
                    "payload": "General|BikeMenu"
                }, {
                    "type": "postback",
                    "title": "News Feed",
                    "payload": "Article|MyFeed"
                }, {
                    "type": "web_url",
                    "title": "Visit CarAndBike",
                    "url": "http://www.carandbike.com"
                }]
            });
        }

        function setGetStartedButton() {
            setThreadSetting({
                "setting_type": "call_to_actions",
                "thread_state": "new_thread",
                "call_to_actions": [{
                    "payload": "General|Hi|false"
                }]
            });
        }

        function setGreetingText() {
            setThreadSetting({
                "setting_type": "greeting",
                "greeting": {
                    // Hi Facebook Name
                    // Auto Advisor

                    // 1 - information
                    // 2 - suggestions
                    // 3 - latest news & reviews in the automotive space

                    // I specialize in

                    // Hi I am CarAndBike Bot. I am here to help you find your next car or bike!
                    // Hi Sunder, I am your personal AutoBot. I can help you find your dream car or bike and stay up to date with latest news and reviews.

                    "text": "Hi I am CarAndBike Bot. I am your personal auto assistant here to help you find your next car or bike !"
                }
            });
        }

        console.log("Setting Threads Settings");
        setGetStartedButton();
        setGreetingText();
        setMenu();
    },
    sendTextMessage: function (recipientId, messageText, cb) {
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                text: messageText
            }
        };

        this.callSendAPI(messageData, cb);
    },
    sendImageMessage: function (recipientId, response, cb) {
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                attachment: {
                    type: "image",
                    payload: {
                        url: response
                    }
                }
            }
        };

        this.callSendAPI(messageData, cb);
    },
    sendVideoMessage: function (recipientId, response, cb) {
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                attachment: {
                    type: "video",
                    payload: {
                        url: response
                    }
                }
            }
        };

        this.callSendAPI(messageData, cb);
    },
    sendButtonMessage: function (recipientId, response, cb) {
        console.log(response.text);
        console.log(response.buttons);
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "button",
                        text: response.text,
                        buttons: response.buttons // Array of Objects having keys type, url, title
                    }
                }
            }
        };
        this.callSendAPI(messageData, cb);
    },
    sendGenericMessage: function (recipientId, response, cb) {
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "generic",
                        elements: response
                    }
                }
            }
        };

        this.callSendAPI(messageData, cb);
    },
    sendQuickRepliesMessage: function (recipientId, response, cb) {
        var message = {
            quick_replies: response.quick_replies
        };

        // Quick Replies requires either text or attachment to be set but not both
        // Attachment could be image, gif etc
        if (response.attachment) {
            message.attachment = response.attachment;
        }
        if (response.text) {
            message.text = response.text;
        }

        var messageData = {
            recipient: {
                id: recipientId
            },
            message: message
        };

        this.callSendAPI(messageData, cb);
    },
    callSendAPI: function (messageData, cb) {
        request({
            uri: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {
                access_token: PAGE_ACCESS_TOKEN
            },
            method: 'POST',
            json: messageData

        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var recipientId = body.recipient_id;
                var messageId = body.message_id;
                console.log("Successfully sent message with id %s to recipient %s", messageId, recipientId);

                if (cb) {
                    cb();
                }
            } else {
                console.error("Unable to send message.");
                console.error(response);
                console.error(error);
            }
        });
    }
};

module.exports = fb;
