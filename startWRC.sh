#!/bin/bash
#
# This script will start the WebServer and Proxy using forever.
#
# To install forever usr:
#     sudo npm install -g forever
#


WRC_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $WRC_DIR

WRC_LOG_DIR=`pwd`/logs
mkdir -p ${WRC_LOG_DIR}

PROXY_LOG="${WRC_LOG_DIR}/proxy.log"
WEB_LOG="${WRC_LOG_DIR}/www-server.log"


#
# Start the proxy
#
cd $WRC_DIR/proxy
forever start                        \
    --append                         \
    --watchDirectory $WRC_DIR/       \
    --watchDirectory $WRC_DIR/proxy/ \
    -l $PROXY_LOG                    \
    --uid wrc-proxy                  \
     runProxy.js


#
# Start the WebServer
#
cd $WRC_DIR/node_modules/wrc-controller/
forever start                        \
    --append                         \
    -l ${WEB_LOG}                    \
    -e ${WEB_LOG}                    \
    --uid wrc-www                    \
     runWebServer.js
