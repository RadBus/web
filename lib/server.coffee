express = require 'express'
morgan = require 'morgan'
compress = require 'compression'
thisPackage = require '../package'

LOG_PREFIX = 'SERVER: ';

# create server
server = express()
server.set 'title', thisPackage.description
server.set 'appVersion', thisPackage.version

# configure logging
loggingFormat = "#{LOG_PREFIX}:remote-addr \":method :url HTTP/:http-version\" :status :res[content-length] request-id=:req[X-Request-ID] \":referrer\" \":user-agent\""
server.use morgan(loggingFormat)

# redirects
server.use (req, res, next) ->
  hostPort = req.get('Host')
  host = /^(.+?)(:\d+)?$/.exec(hostPort)[1]
  isSecure = req.secure or (req.get('x-forwarded-proto') is 'https')
  isLocalhost = host is 'localhost'
  wwwHostname = process.env.RADBUS_WWW_HOSTNAME

  # require HTTPS
  if not isSecure and not isLocalhost
    res.redirect 301, "https://#{hostPort}#{req.url}"

  # require WWW (if configured)
  else if wwwHostname and host.toLowerCase() is wwwHostname
    res.redirect 301, "https://www.#{hostPort}#{req.url}"

  else
    next()

# enable gzip compression
server.use compress()

module.exports = server
