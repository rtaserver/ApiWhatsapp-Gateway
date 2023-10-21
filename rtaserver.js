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
const NodeCache = require("node-cache");
const readline = require("readline");
const pino = require("pino");
const pairingCode = true;
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
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");

var app = express();
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

// functions
const isConnected = () => {
  return rtaserver.user;
};

const { Router } = require("express");
const MessageRouter = Router();

app.all("/send-message", async (req, res) => {
  //console.log(req);
  const pesankirim = req.body.message || req.query.message;
  const number = req.body.number || req.query.number;
  const fileDikirim = req.files;

  let numberWA;
  try {
    if (!req.files) {
      if (!number) {
        res.status(500).json({
          status: false,
          response: "Nomor WA belum tidak disertakan!",
        });
      } else {
        numberWA = "62" + number.substring(1) + "@s.whatsapp.net";
        console.log(await rtaserver.onWhatsApp(numberWA));
        if (isConnected) {
          const exists = await rtaserver.onWhatsApp(numberWA);
          if (exists?.jid || (exists && exists[0]?.jid)) {
            rtaserver
              .sendMessage(exists.jid || exists[0].jid, { text: pesankirim })
              .then((result) => {
                res.status(200).json({
                  status: true,
                  response: result,
                });
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
