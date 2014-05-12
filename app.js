require('coffee-script/register');

const LOG_PREFIX = 'APP: ';

var server = require('./lib/server');

// capabilities
require('./api').register(server);
require('./web').register(server);
require('./oauth2').register(server);

// start server
var port = process.env.PORT || 5000;
server.listen(port, function() {
  console.log(LOG_PREFIX + "%s, app version %s. Listening on %s",
    server.get('title'),
    server.get('appVersion'),
    port);
});
