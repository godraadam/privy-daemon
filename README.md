# Privy Daemon

Privy Daemon serves as the backend for any privy node.

# Install

## Development

### Clone the project
```
git clone https://github.com/godraadam/privy-daemon.git
cd privy-daemon
```
### Start a development node
```
npm run start
```

### Use docker
```
docker build -t godraadam/privyd:alpha
docker run -p 8668:8668 godraadam/privyd:alpha
```
