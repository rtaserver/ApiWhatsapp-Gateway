require("./settings");
const {
  default: WADefault,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  jidDecode,
  makeCacheableSignalKeyStore,
  PHONENUMBER_MCC,
} = require("@adiwajshing/baileys");
const moment = require("moment-timezone");
const NodeCache = require("node-cache");
const readline = require("readline");
const pino = require("pino");
const pairingCode = global.usePairingNumber;
const useMobile = false;
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const question = (text) => new Promise((resolve) => rl.question(text, resolve));
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const PhoneNumber = require("awesome-phonenumber");
const path = require("path");
const { smsg } = require("./lib/simple");

const express = require("express");
const fileUpload = require("express-fileupload");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");

var app = express();

// enable files upload
app.use(
  fileUpload({
    createParentPath: true,
  })
);

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.set("view engine", "ejs");
// Public Path
app.use("/p", express.static(path.resolve("public")));
app.use("/p/*", (req, res) => res.status(404).send("Media Not Found"));

const PORT = global.port || "5000";
app.set("port", PORT);
var server = http.createServer(app);
server.on("listening", () => console.log("APP IS RUNNING ON PORT " + PORT));

server.listen(PORT);

const io = require("socket.io")(server);
const qrcode = require("qrcode");
const { isBoolean } = require("util");

app.use("/assets", express.static(__dirname + "/client/assets"));

app.get("/scan", (req, res) => {
  res.sendFile("./client/server.html", {
    root: __dirname,
  });
});

app.get("/", (req, res) => {
  res.sendFile("./client/index.html", {
    root: __dirname,
  });
});
//fungsi suara capital
function capital(textSound) {
  const arr = textSound.split(" ");
  for (var i = 0; i < arr.length; i++) {
    arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
  }
  const str = arr.join(" ");
  return str;
}

const store = makeInMemoryStore({
  logger: pino().child({
    level: "silent",
    stream: "store",
  }),
});

function nocache(module, cb = () => {}) {
  fs.watchFile(require.resolve(module), async () => {
    await uncache(require.resolve(module));
    cb(module);
  });
}

function uncache(module = ".") {
  return new Promise((resolve, reject) => {
    try {
      delete require.cache[require.resolve(module)];
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

let rtaserver;
let soket;
let qr;

async function Botstarted() {
  const { state, saveCreds } = await useMultiFileAuthState(`./${sessionName}`);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  const msgRetryCounterCache = new NodeCache();
  rtaserver = WADefault({
    version,
    logger: pino({ level: "fatal" }).child({ level: "fatal" }),
    printQRInTerminal: !pairingCode,
    mobile: useMobile,
    browser: ["Chrome (Linux)", "", ""],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        pino({ level: "fatal" }).child({ level: "fatal" })
      ),
    },
    generateHighQualityLinkPreview: true, // make high preview link
    getMessage: async (key) => {
      let jid = jidNormalizedUser(key.remoteJid);
      let msg = await store.loadMessage(jid, key.id);

      return msg?.message || "";
    },
    msgRetryCounterCache, // Resolve waiting messages
    defaultQueryTimeoutMs: undefined,
  });

  store.bind(rtaserver.ev);

  if (pairingCode && !rtaserver.authState.creds.registered) {
    if (useMobile) throw new Error("Cannot use pairing code with mobile api");

    let phoneNumber;
    if (!!pairingNumber) {
      phoneNumber = pairingNumber.replace(/[^0-9]/g, "");

      if (
        !Object.keys(PHONENUMBER_MCC).some((v) => phoneNumber.startsWith(v))
      ) {
        console.log("Start with your country's WhatsApp code, Example : 62xxx");
        process.exit(0);
      }
    } else {
      phoneNumber = await question(`Please type your WhatsApp number : `);
      phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

      // Ask again when entering the wrong number
      if (
        !Object.keys(PHONENUMBER_MCC).some((v) => phoneNumber.startsWith(v))
      ) {
        console.log("Start with your country's WhatsApp code, Example : 62xxx");

        phoneNumber = await question(`Please type your WhatsApp number : `);
        phoneNumber = phoneNumber.replace(/[^0-9]/g, "");
        rl.close();
      }
    }

    setTimeout(async () => {
      let code = await rtaserver.requestPairingCode(phoneNumber);
      code = code?.match(/.{1,4}/g)?.join("-") || code;
      console.log(`Your Pairing Code : `, code);
    }, 3000);
  }

  // Setting
  rtaserver.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      return (
        (decode.user && decode.server && decode.user + "@" + decode.server) ||
        jid
      );
    } else return jid;
  };

  rtaserver.ev.on("contacts.update", (update) => {
    for (let contact of update) {
      let id = rtaserver.decodeJid(contact.id);
      if (store && store.contacts)
        store.contacts[id] = {
          id,
          name: contact.notify,
        };
    }
  });

  rtaserver.getName = (jid, withoutContact = false) => {
    id = rtaserver.decodeJid(jid);
    withoutContact = rtaserver.withoutContact || withoutContact;
    let v;
    if (id.endsWith("@g.us"))
      return new Promise(async (resolve) => {
        v = store.contacts[id] || {};
        if (!(v.name || v.subject)) v = rtaserver.groupMetadata(id) || {};
        resolve(
          v.name ||
            v.subject ||
            PhoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber(
              "international"
            )
        );
      });
    else
      v =
        id === "0@s.whatsapp.net"
          ? {
              id,
              name: "WhatsApp",
            }
          : id === rtaserver.decodeJid(rtaserver.user.id)
          ? rtaserver.user
          : store.contacts[id] || {};
    return (
      (withoutContact ? "" : v.name) ||
      v.subject ||
      v.verifiedName ||
      PhoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber(
        "international"
      )
    );
  };

  rtaserver.sendContact = async (jid, kon, quoted = "", opts = {}) => {
    let list = [];
    for (let i of kon) {
      list.push({
        displayName: await rtaserver.getName(i + "@s.whatsapp.net"),
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await rtaserver.getName(
          i + "@s.whatsapp.net"
        )}\nFN:${await rtaserver.getName(
          i + "@s.whatsapp.net"
        )}\nitem1.TEL;waid=${i}:${i}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
      });
    }
    rtaserver.sendMessage(
      jid,
      {
        contacts: {
          displayName: `${list.length} Kontak`,
          contacts: list,
        },
        ...opts,
      },
      {
        quoted,
      }
    );
  };

  rtaserver.public = true;

  rtaserver.serializeM = (m) => smsg(rtaserver, m, store);

  rtaserver.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      if (reason === DisconnectReason.badSession) {
        console.log(`Bad Session File, Please Delete Session and Scan Again`);
        rtaserver.logout();
      } else if (reason === DisconnectReason.connectionClosed) {
        console.log("Connection closed, reconnecting....");
        Botstarted();
      } else if (reason === DisconnectReason.connectionLost) {
        console.log("Connection Lost from Server, reconnecting...");
        Botstarted();
      } else if (reason === DisconnectReason.connectionReplaced) {
        console.log(
          "Connection Replaced, Another New Session Opened, reconnecting..."
        );
        Botstarted();
      } else if (reason === DisconnectReason.loggedOut) {
        console.log(`Device Logged Out, Please Scan Again And Run.`);
        rtaserver.logout();
      } else if (reason === DisconnectReason.restartRequired) {
        console.log("Restart Required, Restarting...");
        Botstarted();
      } else if (reason === DisconnectReason.timedOut) {
        console.log("Connection TimedOut, Reconnecting...");
        Botstarted();
      } else if (reason === DisconnectReason.Multidevicemismatch) {
        console.log("Multi device mismatch, please scan again");
        rtaserver.logout();
      } else rtaserver.end(`Unknown DisconnectReason: ${reason}|${connection}`);
    }
    if (
      update.connection == "open" ||
      update.receivedPendingNotifications == "true"
    ) {
      console.log(`Connected to = ` + JSON.stringify(rtaserver.user, null, 2));
    }

    if (update.qr) {
      qr = update.qr;
      updateQR("qr");
    } else if ((qr = undefined)) {
      updateQR("loading");
    } else {
      if (update.connection === "open") {
        updateQR("qrscanned");
        return;
      }
    }
  });

  rtaserver.ev.on("creds.update", saveCreds);

  rtaserver.sendText = (jid, text, quoted = "", options) =>
    rtaserver.sendMessage(
      jid,
      {
        text: text,
        ...options,
      },
      {
        quoted,
        ...options,
      }
    );
  return rtaserver;
}

io.on("connection", async (socket) => {
  soket = socket;
  // console.log(sock)
  if (isConnected) {
    updateQR("connected");
  } else if (qr) {
    updateQR("qr");
  }
});

// functions
const isConnected = () => {
  return rtaserver.user;
};

const updateQR = (data) => {
  switch (data) {
    case "qr":
      qrcode.toDataURL(qr, (err, url) => {
        soket?.emit("qr", url);
        soket?.emit("log", "QR Code received, please scan!");
      });
      break;
    case "connected":
      soket?.emit("qrstatus", "./assets/check.svg");
      soket?.emit("log", "WhatsApp terhubung!");
      break;
    case "qrscanned":
      soket?.emit("qrstatus", "./assets/check.svg");
      soket?.emit("log", "QR Code Telah discan!");
      break;
    case "loading":
      soket?.emit("qrstatus", "./assets/loader.gif");
      soket?.emit("log", "Registering QR Code , please wait!");
      break;
    default:
      break;
  }
};

app.all("/send-message", async (req, res) => {
  //console.log(req);
  const pesankirim = req.body.message || req.query.message;
  const number = req.body.number || req.query.number;
  let numberWA;
  try {
    if (!req.files) {
      if (!number) {
        res.status(500).json({
          status: false,
          response: "Nomor WA belum tidak disertakan!",
        });
      } else {
        if (number.startsWith("0")) {
          numberWA =
            global.countrycodephone + number.substring(1) + "@s.whatsapp.net";
        } else {
          numberWA = number + "@s.whatsapp.net";
        }

        console.log(await rtaserver.onWhatsApp(numberWA));
        if (isConnected) {
          const exists = await rtaserver.onWhatsApp(numberWA);
          if (exists?.jid || (exists && exists[0]?.jid)) {
            var usepp = {};
            if (global.use_pp == true) {
              usepp = {
                image: pp_bot,
                caption: pesankirim,
              };
            } else {
              usepp = {
                text: pesankirim,
              };
            }

            rtaserver
              .sendMessage(exists.jid || exists[0].jid, usepp)
              .then((result) => {
                res.status(200).json({
                  status: true,
                  response: result,
                });

                if (global.kirimkontak_admin == true) {
                  rtaserver.sendContact(
                    exists.jid || exists[0].jid,
                    global.kontakadmin
                  );
                }
              })
              .catch((err) => {
                res.status(500).json({
                  status: false,
                  response: err,
                });
              });
          } else {
            res.status(500).json({
              status: false,
              response: `Nomor ${number} tidak terdaftar.`,
            });
          }
        } else {
          res.status(500).json({
            status: false,
            response: `WhatsApp belum terhubung.`,
          });
        }
      }
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

Botstarted();
