require('coffee-script/register');
var thisPackage = require('./package');

const LOG_PREFIX = 'APP: ';

var server = require('./server');

// capabilities

// start server
var port = process.env.PORT || 5000;
server.listen(port, function() {
  console.log(LOG_PREFIX + "%s, version %s. Listening on %s",
    server.get('title'),
    thisPackage.version,
    port);
});
