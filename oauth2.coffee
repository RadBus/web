request = require 'request'
util = require 'util'

LOG_PREFIX = 'OAUTH2:';

exports.register = (server) ->
  # serve up client-side config file that contains all the Google OAuth2 config values
  server.get '/js/oauth2-config.js', (req, res) ->
    res.set 'Content-Type', 'application/javascript'
    res.send "var googleClientId = '#{process.env.RADBUS_GOOGLE_API_CLIENT_ID}';\n
              var googleClientSecret = '#{process.env.RADBUS_GOOGLE_API_CLIENT_SECRET}';\n
              var googleAuthScopes = '#{process.env.RADBUS_GOOGLE_API_AUTH_SCOPES}';\n
              var googleOAuth2CallbackUrl = '#{process.env.RADBUS_GOOGLE_OAUTH2_CALLBACK_URL}'\n";

  # handler for the OAuth2 callback
  server.get "/#{process.env.RADBUS_GOOGLE_OAUTH2_CALLBACK_URL}", (req, res) ->
    console.log "#{LOG_PREFIX} Before token exchange: state = #{req.query.state}, code = #{req.query.code}"

    r = request.post 'https://accounts.google.com/o/oauth2/token', (err, response, body) ->
      if (err) then throw err

      json = JSON.parse body

      inspectOptions = depth: null
      console.log "#{LOG_PREFIX} After token exchange: state = #{req.query.state}, data = #{util.inspect(json, inspectOptions)}"

      if req.query.state is 'online'
        res.redirect '/'
      else if req.query.state is 'offline'

        console.log "FOO-1"

        # res.send "#{json.refresh_token}"
# res.send "<!DOCTYPE html>
#           <html>
#             <head>
#               <title>Application Token</title>
#             </head>
#             <body>
        res.send "<!DOCTYPE html>
                  <html>
                    <head>
                      <title>Application Token</title>
                    </head>
                    <body>
                      Here's your Application Token:
                      <h1>#{json.refresh_token}</h1>
                      Don't lose it, bro.
                      <p><a href=\"/\">Back Home</a></p>
                    </body>
                  </html>"
#
#               <p><a href="/">Back Home</a></p>
#             </body>
#           </html>"

        console.log "FOO-2"

      else
        res.send "You're in!  But not sure what to do with you (state = #{req.query.state})."

    r.form
      code: req.query.code
      client_id: process.env.RADBUS_GOOGLE_API_CLIENT_ID
      client_secret: process.env.RADBUS_GOOGLE_API_CLIENT_SECRET
      redirect_uri: "#{req.protocol}://#{req.get('host')}/#{process.env.RADBUS_GOOGLE_OAUTH2_CALLBACK_URL}"
      grant_type: 'authorization_code'
