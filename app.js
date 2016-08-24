"use strict"

const express = require('express');
const path = require('path');
const fs = require('fs');
const fsx = require('fs-extra');
const serveIndex = require('serve-index');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use((req, res, next) => {
  var address = req.connection.remoteAddress;
  if (address.startsWith('::ffff:'))
    address = address.substr(7);
  req.address = address;
  next();
});
fsx.emptyDirSync('public');
const config = JSON.parse(fs.readFileSync('dirs.json'));
config.forEach((value, index, array) => {
  let ipfilter;
  if (value.ip) {
    ipfilter = (req, res, next) => {
      if (req.address !== '127.0.0.1' && req.address !== '::1' && !value.ip.some((value, index, array) => req.address === value)) {
        console.log(req.address);
        res.status(404).render('error', {
          message: 'Not Available',
          error: {}
        });
        return;
      }
      next();
    };
  }
  if (value.all) {
    const subDirs = fs.readdirSync(value.root);
    subDirs.forEach((subDir, index, array) => {
      const root = path.join(value.root, subDir);
      if (fs.statSync(root).isDirectory()) {
        addRoute(!!value.path ? (value.path.endsWith('/') ? value.path : value.path + '/') + subDir : '/' + subDir, root, ipfilter, value.hidden);
      }
    });
  }
  else
    addRoute(value.path, value.root, ipfilter, value.hidden);
});

function addRoute(path_, root, ipfilter, hidden) {
  if (ipfilter)
    app.use(path_, ipfilter);
  app.use(path_, express.static(root), serveIndex(root, { 'icons': true, 'view': 'details' }));
  if (!hidden)
    fsx.ensureDirSync(path.join('public', path_));
}

app.use('/', express.static('public'), serveIndex('public', { 'icons': true }));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers
// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
