# Install the various services

```sh
sudo apt install setserial

cd beaglebone/install
npm install

function install_service {
    SERVICE=$1

    sudo cp ${SERVICE} /etc/systemd/system/
    sudo systemctl enable ${SERVICE}
    sudo systemctl start ${SERVICE}
}

install_service comms-server.service
install_service init-ublox-gps.service
install_service studious-octo-guide.service
```

The following shows you how to access certain service details.

```sh
# Optional: Disable a service
sudo systemctl disable comms-server.service

# Optional: status
sudo systemctl status comms-server.service

# Optional: log
sudo journalctl -u comms-server.service

# Optional: tail the log
sudo journalctl -u comms-server.service -f
```
