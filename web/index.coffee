serveStatic = require 'serve-static'

exports.register = (server) ->
  server.get '/js/config.js', (req, res) ->
    res.set 'Content-Type', 'application/javascript'
    res.send "var googleClientId = '#{process.env.BUS_API_GOOGLE_API_CLIENT_ID}';\n
              var googleClientSecret = '#{process.env.BUS_API_GOOGLE_API_CLIENT_SECRET}';\n
              var googleAuthScopes = '#{process.env.BUS_API_GOOGLE_API_AUTH_SCOPES}';\n
              var googleAnalyticsId = '#{process.env.BUS_API_GOOGLE_ANALYTICS_ID}';"

  server.use serveStatic('web/static')
