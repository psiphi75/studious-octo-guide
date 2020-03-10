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
# These commands send data to the u-blox GPS device
#
UBOX_GPS=/dev/ttyS2
sudo /bin/setserial ${UBOX_GPS} -a baud_base 38400

# GxGSA off
echo -n -e \\xB5\\x62\\x06\\x01\\x08\\x00\\xF0\\x02\\x00\\x00\\x00\\x00\\x00\\x01\\x02\\x32\\x10\\x13 > ${UBOX_GPS}
sleep 1

# GxGSV off
echo -n -e \\xB5\\x62\\x06\\x01\\x08\\x00\\xF0\\x03\\x00\\x00\\x00\\x00\\x00\\x01\\x03\\x39\\x10\\x13 > ${UBOX_GPS}
sleep 1

# GxRMC off
echo -n -e \\xB5\\x62\\x06\\x01\\x08\\x00\\xF0\\x04\\x00\\x00\\x00\\x00\\x00\\x01\\x04\\x40\\x10\\x13 > ${UBOX_GPS}
sleep 1

# GxVTG off
echo -n -e \\xB5\\x62\\x06\\x01\\x08\\x00\\xF0\\x05\\x00\\x00\\x00\\x00\\x00\\x01\\x05\\x47\\x10\\x13 > ${UBOX_GPS}
sleep 1

# GxGLL off
echo -n -e \\xB5\\x62\\x06\\x01\\x08\\x00\\xF0\\x01\\x00\\x00\\x00\\x00\\x00\\x01\\x01\\x2B\\x10\\x13 > ${UBOX_GPS}
sleep 1

# NMEA rate: 5Hz
echo -n -e \\xB5\\x62\\x06\\x08\\x06\\x00\\xC8\\x00\\x01\\x00\\x01\\x00\\xDE\\x6A\\x10\\x13 > ${UBOX_GPS}
