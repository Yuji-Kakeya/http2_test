const https = require("https");
const http2 = require("http2");
const fs = require("fs")
const express = require("express");
const http1App = express();
const http2App = require('http2-express-bridge')(express);

const HTTP1_PORT = 443;
const HTTP2_PORT = 8443;

const setCacheControl = (req,res,next) => {
    res.set({"Cache-Control": "no-store"});
    next();
}

const logging = (req, res, next) => {
    console.log(`[${req.socket.localPort === HTTP1_PORT ? "HTTP/1" : "HTTP/2"}] Source ${req.socket.remoteAddress}:${req.socket.remotePort} -> Dest ${req.path}`);
    next();
}

[setCacheControl, logging, express.static("pub")].forEach(f => {
    http1App.use(f);
    http2App.use(f)
});

const get = (req,res) => res.sendFile("pub/index.html");
http1App.get("/*", get);
http2App.get("/*", get);

const option = {
    key: fs.readFileSync("private.pem"),
    cert: fs.readFileSync("public.crt"),
}

const h1 = https.createServer(option, http1App);
const h2 = http2.createSecureServer(Object.assign(option, {allowHTTP1: false}), http2App);

h1.listen(HTTP1_PORT);
h2.listen(HTTP2_PORT);
