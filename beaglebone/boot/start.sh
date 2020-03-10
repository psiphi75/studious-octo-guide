#!/bin/bash
#####################################################################
#                                                                   #
#   Copyright 2016 Simon M. Werner                                  #
#                                                                   #
#   Licensed to the Apache Software Foundation (ASF) under one      #
#   or more contributor license agreements.  See the NOTICE file    #
#   distributed with this work for additional information           #
#   regarding copyright ownership.  The ASF licenses this file      #
#   to you under the Apache License, Version 2.0 (the               #
#   "License"); you may not use this file except in compliance      #
#   with the License.  You may obtain a copy of the License at      #
#                                                                   #
#      http://www.apache.org/licenses/LICENSE-2.0                   #
#                                                                   #
#   Unless required by applicable law or agreed to in writing,      #
#   software distributed under the License is distributed on an     #
#   "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY          #
#   KIND, either express or implied.  See the License for the       #
#   specific language governing permissions and limitations         #
#   under the License.                                              #
#                                                                   #
#####################################################################

#
# Start the main application that runs the robotic sailboat.
#

NODE=/usr/bin/node
SCRIPT_DIR=/home/debian/studious-octo-guide/beaglebone
export NODE_CONFIG_DIR=${SCRIPT_DIR}/config

export DEBUG=1  # Comment to disable debug logs.  FIXME: we should use NODE_ENV
export NODE_ENV=production

#
# Hardware specific performance improvements
#

# Set to max performance.  At the end we set this to powersave
#FIXME: remove sudo perms
sudo cpufreq-set -g performance
function slow_later {
    sleep 120
    
    # Do a trim on every boot
    fstrim -v /

    # We've booted, now we can slow down and rest
    sudo cpufreq-set -g powersave
}
slow_later &

# The simplist I/O scheduler for the Linux Kernel
echo noop > /sys/block/mmcblk0/queue/scheduler

# Don't write stuff to disk very often
sysctl vm.swappiness=10

#
# Start the actual controller
#

cd ${SCRIPT_DIR}
${NODE} index.js

