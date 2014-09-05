request = require 'request'
util = require 'util'

LOG_PREFIX = 'OAUTH2:';

exports.register = (server) ->
  # handler for the OAuth2 callback
  server.get "/oauth2callback", (req, res) ->
    console.log "#{LOG_PREFIX} Getting OAuth2 info from API..."

    request.get "#{process.env.RADBUS_API_BASE_URL}/oauth2", (err, response, body) ->
      if (err) then throw err

      oAuth2Info = JSON.parse body

      inspectOptions = depth: null
      console.log "#{LOG_PREFIX} OAuth2 Info = #{util.inspect(oAuth2Info, inspectOptions)}"

      console.log "#{LOG_PREFIX} Before token exchange: state = #{req.query.state}, code = #{req.query.code}"

      r = request.post 'https://accounts.google.com/o/oauth2/token', (err, response, body) ->
        if (err) then throw err

        json = JSON.parse body


        console.log "#{LOG_PREFIX} After token exchange: state = #{req.query.state}, data = #{util.inspect(json, inspectOptions)}"

        if json.error
          res.send "An error occurred aquiring the Google OAuth2 token: #{json.error}"

        else if req.query.state is 'online'
          res.redirect '/'

        else if req.query.state is 'beta'
          res.redirect '/beta'

        else if req.query.state is 'offline'
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

        else
          res.send "You're in!  But not sure what to do with you (state = #{req.query.state})."

      isSecure = req.secure or (req.get('x-forwarded-proto') is 'https')
      protocol = if isSecure then 'https' else 'http'

      r.form
        code: req.query.code
        client_id: oAuth2Info.client_id
        client_secret: oAuth2Info.client_secret
        redirect_uri: "#{protocol}://#{req.get('host')}/oauth2callback"
        grant_type: 'authorization_code'
