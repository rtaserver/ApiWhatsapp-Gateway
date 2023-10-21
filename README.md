# Whatsapp Api Gateway

![](https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/240px-WhatsApp.svg.png)

![](https://img.shields.io/github/v/release/rtaserver/ApiWhatsapp-Gateway) ![](https://img.shields.io/github/license/rtaserver/ApiWhatsapp-Gateway)

# Headless Multi Session Whatsapp Gateway NodeJS

Easy Setup Headless multi session Whatsapp Gateway with NodeJS

- Support multi device
- Support Pairing Code
- Support QR Code
- Anti delay message

#### Based on [WhiskeySockets-Baileys](https://github.com/WhiskeySockets/Baileys)

## Settings Variables

To run this project, you will need to edit variables in `settings.js` file

```
global.port = "5001"; // port api / browser
//========================================================
global.usePairingNumber = true; // if false - use qrcode
global.pairingNumber = ""; //use your whatsapp number to install bot
//========================================================
global.sessionName = "session"; // session name
```

## Install and Running

Clone the project

```bash
  git clone https://github.com/rtaserver/ApiWhatsapp-Gateway.git
```

Go to the project directory

```bash
  cd ApiWhatsapp-Gateway
```

Install dependencies

```bash
  npm install
```

Start the server

```bash
  npm run start
```

Open On Browser & Start New Session to Get QRCode if PairingCode False

```bash
  http://localhost:5001/scan
```

## API Reference

#### Send Text Message

```
  POST /send-message
  GET /send-message?message=Text&number=08123456789
```

| Body | Type | Description |
| :-------- | :------- | :------------------------------------------------------------------------------------ | |
| `message` | `string` | **Required**. Text Message |
| `number` | `string` | **Required**. Receiver Phone Number (e.g: 62812345678 / 0812345678)|

## Changelog

V1.0.1

- Support Pairing Code
- Support And Fix QR Code
- Update README.md
