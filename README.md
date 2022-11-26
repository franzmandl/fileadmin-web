# FileAdmin - Web Client

FileAdmin is a web-based mobile-first file manager.
This project contains web client code only.
For the corresponding server project see [fileadmin-server](https://github.com/franzmandl/fileadmin-server).
This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

![Screenshot Ticket](assets/screenshot_ticket.png)

## Set up

```shell
npm install
```

## Run in Development Mode

```shell
npm run start
```

Listens on port [3000](http://localhost:3000/).

## Test

```shell
CI=true npm run test
```

## Build for Production

```shell
npm run build
```

## Deploy

```shell
mkdir -p /opt/fileadmin/web
rsync -aiv --delete ./build/ /opt/fileadmin/web
```

## Run in Production Mode

Files in `/opt/fileadmin/web` should be served by FileAdmin production server.
