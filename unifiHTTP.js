module.exports = function(RED)
{
    const https = require('https');

    /**
     * The Unifi HTTP GET node
     * 
     * @param {Object} config
     * @returns {void}
     * 
     */
    function unifiHTTP(config)
    {
        RED.nodes.createNode(this, config);
        let nodeHTTP = this;
        nodeHTTP.unifiLogin = RED.nodes.getNode(config.unifiLogin);
        
        /**
         * Node input handler
         * 
         * @param {Object} msg The incoming payload
         * @returns {void}
         */
        nodeHTTP.on('input', function(msg)
        {
            nodeHTTP.send({things: this.unifiLogin});
            const url = 'https://' + nodeHTTP.unifiConfig.controllerIp + msg.endpoint;

            // Request options
            const options = {
                method: 'GET',
                rejectUnauthorized: false,
                headers: {
                    cookie: this.unifiLogin.setCookie
                }
            }
            const request = https.request(url, options, (response) =>
            {
                response.on('data', (body) =>
                {
                    // Debug message with full response
                    node.warn({headers: response.headers, payload: JSON.parse(body), status: response.statusCode});
                    if (response.statusCode == 200)
                    {
                        // Do something if successful request
                    }
                    else
                    {
                        // Do something if request fails
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

    // Register the requestHTTP node
    RED.nodes.registerType("unifi-HTTP", unifiHTTP);
}