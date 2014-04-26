request = require 'request'

LOG_PREFIX = 'OAUTH2:';

exports.register = (server) ->
  # serve up client-side config file that contains all the Google OAuth2 config values
  server.get '/js/oauth2-config.js', (req, res) ->
    res.set 'Content-Type', 'application/javascript'
    res.send "var googleClientId = '#{process.env.BUS_API_GOOGLE_API_CLIENT_ID}';\n
              var googleClientSecret = '#{process.env.BUS_API_GOOGLE_API_CLIENT_SECRET}';\n
              var googleAuthScopes = '#{process.env.BUS_API_GOOGLE_API_AUTH_SCOPES}';\n
              var googleOAuth2CallbackUrl = '#{process.env.BUS_API_OAUTH2_CALLBACK_URL}'\n";

  # handler for the OAuth2 callback
  server.get "/#{process.env.BUS_API_OAUTH2_CALLBACK_URL}", (req, res) ->
    console.log "#{LOG_PREFIX} Before token exchange: state = #{req.query.state}, code = #{req.query.code}"

    r = request.post 'https://accounts.google.com/o/oauth2/token', (err, response, body) ->
      if (err) then throw err

      json = JSON.parse body

      console.log "#{LOG_PREFIX} After token exchange: state = #{req.query.state}, access_token = #{json.access_token}, expires_in = #{json.expires_in}, token_type = #{json.token_type}"

      if req.query.state is 'online'
        res.redirect '/'
      else
        res.send "You're in!  But not sure what to do with you (state = #{req.query.state})."

    r.form
      code: req.query.code
      client_id: process.env.BUS_API_GOOGLE_API_CLIENT_ID
      client_secret: process.env.BUS_API_GOOGLE_API_CLIENT_SECRET
      redirect_uri: "#{req.protocol}://#{req.get('host')}/#{process.env.BUS_API_OAUTH2_CALLBACK_URL}"
      grant_type: 'authorization_code'
