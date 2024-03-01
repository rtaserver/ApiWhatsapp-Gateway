<h1 align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/240px-WhatsApp.svg.png" alt="PhpNuxBill" width="150">
  <br>Api Whatsapp Gateway - To send notifications to customers<br>
</h1>

<h4 align="center">Unofficial Whatsapp Gateway Using NodeJs</h4>

<p align="center">
  <a href="https://github.com/rtaserver/ApiWhatsapp-Gateway/releases">
    <img alt="GitHub release (with filter)" src="https://img.shields.io/github/v/release/rtaserver/ApiWhatsapp-Gateway?label=Latest%20Release&labelColor=CE5A67">
  </a>
  <a href="https://github.com/rtaserver/ApiWhatsapp-Gateway/blob/main/LICENSE">
   <img alt="GitHub" src="https://img.shields.io/github/license/rtaserver/ApiWhatsapp-Gateway">
  </a>
  
</p>

## Features

Easy Setup Headless multi session Whatsapp Gateway with NodeJS.

- Support multi device
- Support Pairing Code
- Anti delay message

<p>

#### Based on [WhiskeySockets-Baileys](https://github.com/WhiskeySockets/Baileys)

#### Free Whatsapp Gateway By IbnuX [https://wa.nux.my.id/](https://wa.nux.my.id/)

<p>

## Documentation

### Settings Variables

To run this project, you will need to edit variables in `settings.js` file

```
// ============= GLOBAL SETTING ============ //
global.port = "5001"; // Port Api / Browser
global.countrycode = "ID"; // Country Code - https://countrycode.org/ (ISO CODES)
global.countrycodephone = "62"; // Country Phone - https://countrycode.org/ (COUNTRY CODE)
global.timezone = "Asia/Jakarta"; // Time Zone
global.usePairingNumber = false; // true = Pairing Code / false = QRCode
global.pairingNumber = ""; // whatsapp number used as a bot, for pairing number
//========================================================

global.pp_bot = fs.readFileSync("./image/logo.png"); // location and name of the logo
global.use_pp = true; // use a logo?

//========================================================

global.kontakadmin = ["6281287123512"]; // admin whatsapp number
global.kirimkontak_admin = false; // true = automatically send admin contact

//========================================================

global.sessionName = "session"; // session name

//========================================================

```

### Install and Running

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

| Body      | Type     | Description                                                         |
| :-------- | :------- | :------------------------------------------------------------------ |
| `message` | `string` | **Required**. Text Message                                          |
| `number`  | `string` | **Required**. Receiver Phone Number (e.g: 62812345678 / 0812345678) |

## Changelog

#### [CHANGELOG.md](CHANGELOG.md)
