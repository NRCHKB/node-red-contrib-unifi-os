const { stringify } = require('querystring');

module.exports = function(RED)
{
    const https = require('https');
    const cookie = require('cookie');


    /**
     * The Cookie Monster node
     * 
     * @param {Object} config
     * @returns {void}
     */
    function CookieMonster(config) 
    {
        RED.nodes.createNode(this, config);
        var node = this;

        /**
         * This node's input handler
         * 
         * @param {Object} msg The imcoming payload
         * @returns {void}
         */
        node.on('input', function(msg) 
        {
            // Build the HTTPS request for Unifi OS
            const url = 'https://' + config.controllerIp + '/api/auth/login';
            const post_data = JSON.stringify({
                username: config.username,
                password: config.pass
            });

            // Request options
            const options = {
                method: 'POST',
                rejectUnauthorized: false,
                keepAlive: true,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(post_data)
                }
            };

            // Send login to Unifi, if successful, cookies will be returned in response
            const request = https.request(url, options, (response) =>
            {
                response.on('data', (body) =>
                {
                    // Debug message with full response
                    node.warn({headers: response.headers, payload: JSON.parse(body), status: response.statusCode});

                    // If successful - save the important cookies for use in other nodes
                    if (response.statusCode == 200)
                    {
                        // Parsed cookie:
                        let cookiesJSON = cookie.parse(response.headers['set-cookie'][0]);
                        node.warn(cookiesJSON);
                        
                        // let matches = [...response.headers['set-cookie'][0].matchAll(/TOKEN=([^;]+)/mg)];

                        // if (typeof matches[0][1] !== 'undefined')
                        // {
                        //     node.warn({cookie: matches[0][1]});
                        // }
                        // else
                        // {
                        //     node.warn('Unknown token');
                        // }
                    }
                    else
                    {
                        node.warn(response.statusCode);
                    }
                });
            });
            
            // Catch login errors
            request.on('error', (e) =>
            {
                node.warn(e);
            });

            // Include post data
            request.write(post_data);

            // Close request
            request.end();
        });
    }

    // Register the CookieMonster node
    RED.nodes.registerType("cookie-monster", CookieMonster);
}
