exports.register = (server) ->
  # serve up client-side config file that contains all the Google OAuth2 config values
  server.get '/scripts/api-config.js', (req, res) ->
    res.set 'Content-Type', 'application/javascript'
    res.send "var apiBaseUrl = '#{process.env.RADBUS_API_BASE_URL}';\n" +
             "var apiKey = '#{process.env.RADBUS_API_KEY}';\n";
