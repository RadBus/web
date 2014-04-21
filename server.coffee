express = require 'express'
morgan = require 'morgan'
compress = require 'compression'
thisPackage = require './package'

LOG_PREFIX = 'SERVER: ';

# create server
server = express()
server.set 'title', thisPackage.description

# configure logging
loggingFormat = "#{LOG_PREFIX}:remote-addr \":method :url HTTP/:http-version\" :status :res[content-length] request-id=:req[X-Request-ID] \":referrer\" \":user-agent\""
server.use morgan(loggingFormat)

# enable gzip compression
server.use compress()

module.exports = server
