thisPackage = require '../package'
serveStatic = require 'serve-static'

exports.register = (server) ->
  # serve up client-side config file that contains all the Google Analytics config values
  server.get '/scripts/google-analytics-config.js', (req, res) ->
    res.set 'Content-Type', 'application/javascript'
    res.send "var googleAnalyticsId = '#{process.env.RADBUS_GOOGLE_ANALYTICS_ID}';\n";

  # version page
  server.get '/version', (req, res) ->
    res.set 'Content-Type', 'text/plain'
    res.send "Application Version = #{thisPackage.version}"

  # serve up static client-side files (the web app)
  server.use '/', serveStatic('web/dist')
  server.use '/beta', serveStatic('web/beta')
