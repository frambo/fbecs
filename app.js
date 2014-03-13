/**
 * @fileOverview Main function of "fbecs" software
 * @author <a href="mailto:filipe.roquette@gmail.com">Filipe Roquette</a>
 * @version 0.0.1
 */


// Module dependencies
var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var adm = require('./routes/adm');
var socketio = require('socket.io');
var http = require('http');
var path = require('path');
var fs = require('fs');
var validate = require('jsonschema').validate;

var FB = require('fb');
var schedule = require('./schedule.js');
var passport = require('./oauth-fb.js');
var logger = require("./logger.js");

var app = express();
var log = logger();


// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(log.requestLogger());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('MY-SECRET-KEY'));
app.use(express.session());
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// Handle 404 - page not found
app.use(function(req, res) {
  res.status(400);
  res.render('404.jade', {
    title: 'ECS Express'
  });
});

// Handle 500 - internal system error
app.use(function(error, req, res, next) {
  res.status(500);
  res.render('500.jade', {
    title: 'ECS Express'
  });
});


// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}



app.get('/', routes.index);
app.get('/users', user.list);
// app page to manage jobs statuses
app.get('/adm', ensureAuthenticated, adm.jobadm);
// app page to list events in database
app.get('/fbevtlist', routes.fbevtlist);
// app page to show details of specific event in database
app.get('/fbevtdetails', routes.fbevtdetails);
// app log page for issue tracking
app.get('/log', routes.fblog(path, fs));
// Facebook authentication
app.get('/auth/facebook', passport.authenticate('facebook', {
  scope: ['publish_stream', 'manage_pages']
}), function(req, res) {});
app.get('/auth/facebook/callback', passport.authenticate('facebook', {
  failureRedirect: '/loginError'
}), function(req, res) {
  res.redirect('/');
});
// logout user
app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});
// Login problem
app.get('/loginError', function(req, res) {
  res.status(700);
  res.render('700.jade', {
    title: 'ECS Express'
  });
});

//Posts
app.post('/publish', routes.publish);

//log.level('warn');
console.log("Current log level: " + log.level());
var server = app.listen(app.get('port'), function() {
  log.info('Express server listening on port ' + app.get('port'));
});

var io = socketio.listen(server, {
  logger: log
});
var admInUse = false; // Allow only one administrator in parallel
var client_id, socket_id;

// settings for the socket layer
io.set('log level', 1);

io.sockets.on('connection', function(socket) {
  // Handle connect requests
  socket.on('connRequest', function(clientId) {
    // Is Administration already in use?
    if (!admInUse) {
      // Does not exist ... so, proceed
      // Set admin in use
      client_id = clientId; //save client id in memory
      socket_id = socket.id; // save socket id in memory
      admInUse = true; // lock admin 
      log.info({
        client: clientId,
        socket: socket.id
      }, 'Administration access accepted!');
      io.sockets.sockets[socket_id].emit('connReply', {
        "source": clientId,
        "reply": 'ack',
        "command": 'connect',
        "target": 'undefined',
        "result": ''
      });
    } else {
      // Do not accept...
      log.info({
        client: clientId,
        socket: socket.id
      }, 'Administration access denied!');
      io.sockets.sockets[socket_id].emit('connReply', {
        "source": clientId,
        "reply": 'nack',
        "command": 'connect',
        "target": 'undefined',
        "result": 'Error: Administration access denied!'
      });
    }

  });
  // Handle command requests
  socket.on('cmdRequest', function(msg) {
    // Is this client an Admin?
    if (admInUse && (client_id == msg.source)) {
      var reply, result;
      switch (msg.command) {
        case 'status':
          reply = 'ack';
          result = getStatusString(msg.target);
          break;
        case 'toggle':
          result = toggleStatus(msg.target);
          if (result == '')
            reply = 'nack';
          else
            reply = 'ack';
          break;
        default:
          reply = 'nack';
          result = 'Error: Unknown command!';
      }
      // Accept command
      log.info({
        client: msg.source,
        socket: socket_id,
        target: msg.target,
        cmd: msg.command
      }, 'Command accepted!');
      io.sockets.sockets[socket_id].emit('cmdReply', {
        "source": msg.source,
        "reply": reply,
        "command": msg.command,
        "target": msg.target,
        "result": result
      });
    } else {
      // Do not accept...
      log.info({
        client: msg.source,
        socket: socket_id,
        target: msg.target,
        cmd: msg.command
      }, 'Command not accepted!');
      io.sockets.sockets[socket_id].emit('cmdReply', {
        "source": msg.source,
        "reply": 'nack',
        "command": msg.command,
        "target": msg.target,
        "result": 'Error: Command not allowed!'
      });
    }
  });
  socket.on('disconnect', function() {
    admInUse = false;
  });
})


// Test function
//schedule.jobTest('getfbevents');
//schedule.jobTest('feedfbevents');


/**
 * @function
 * @desc - get status of scheduled jobs
 * @param {string} target - ['All'|'job1'|'job2']
 * @return {string} str - example: "True;True;"
 */
function getStatusString(target) {
  var str = '';
  switch (target) {
    case 'All':
      str = str.concat(schedule.jobStatus('getfbevents') ? 'True' : 'False', ';',
        schedule.jobStatus('feedfbevents') ? 'True' : 'False', ';');
      break;
    case 'job1':
      str = str.concat(schedule.jobStatus('getfbevents') ? 'True' : 'False', ';*;');
      break;
    case 'job2':
      str = str.concat('*;', schedule.jobStatus('feedfbevents') ? 'True' : 'False', ';');
      break;
    default:
      str = str.concat('*;*;');
  }
  return str;
}

/**
 * @function
 * @desc - toggle status of scheduled jobs
 * @param {string} target - [job1'|'job2']
 * @return {string} str - example: "Toggle ok!"
 */
function toggleStatus(target) {
  var str = '';
  switch (target) {
    case 'job1':
      if (schedule.jobToggle('getfbevents'))
        str = 'Toggle ok!';
      else
        str = 'Toggle not ok!';
      break;
    case 'job2':
      if (schedule.jobToggle('feedfbevents'))
        str = 'Toggle ok!';
      else
        str = 'Toggle not ok!';
      break;
    default:
  }
  return str;
}

/**
 * @function
 * @desc - authenticate user, if fails redirect to home
 * @param {object} req
 * @param {object} res
 * @param {function} next
 * @return {function} next() - call next() function
 */
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/')
}