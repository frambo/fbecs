/**
 * Scheduler for triggering periodic background jobs for:
 * job1 - collecting relevant events from FB and stored them in DB;
 * job2 - publish interesting events to a defined FB page;
 * @module 
 */
var path = require('path');
var fs = require('fs');
var FB = require('fb');
var validate = require('jsonschema').validate;
var schedule = require('node-schedule');
var store = require('./store.js');
var logger = require("./logger.js");

var log = logger();
var jobsArray = [];
var access_token = new String();

var read_events_rule = new schedule.RecurrenceRule();
read_events_rule.second = 30;
var feed_events_rule = new schedule.RecurrenceRule();
feed_events_rule.second = 50;
// Set Cron like job schedules
//events_rule = '*/1 * * * *';
//feeds_rule = '*/2 * * * *';


/**
 * @function
 * @desc - toggle status of scheduled job
 * @param {string} job_type
 * @return {object} scheduled job
 */
exports.jobToggle = function(job_type) {

  if (this.jobStatus(job_type)) {
    // Cancel job
    log.info({
      job: job_type
    }, 'Cancel scheduled job!');
    return this.jobCancel(job_type);
  } else {
    // Start job
    log.info({
      job: job_type
    }, 'Start scheduled job!');
    return this.jobStart(job_type);
  }
}

/**
 * @function
 * @desc - Start scheduled job
 * @param {string} job_type
 * @return {boolean} error
 */
exports.jobStart = function(job_type) {
  var error = false;

  switch (job_type) {
    case 'getfbevents':
      //call function
      log.info({
        job: job_type,
        name: 'getfbevents'
      }, 'Start scheduled job!');
      if (access_token.length == 0)
        getToken(function() {
          jobsArray[0] = fbgetevents();
        });
      else {
        if (jobsArray[0] === undefined) {
          log.error('Cannot start job - instance already running!');
          error = true;
        } else
          jobsArray[0] = fbgetevents();
      }
      break;
    case 'feedfbevents':
      //call function
      log.info({
        job: job_type,
        name: 'feedfbevents'
      }, 'Start scheduled job!');
      if (access_token.length == 0)
        getToken(function() {
          jobsArray[1] = fbfeedevents();
        });
      else {
        if (jobsArray[1] === undefined) {
          log.error('Cannot start job - instance alrerady running!');
          error = true;
        } else
          jobsArray[1] = fbfeedevents();
      }
      break;
    default:
      log.error("Cannot find job type to schedule!");
      error = true;
  }
  return !error;
}

/**
 * @function
 * @desc - Cancel scheduled job
 * @param {string} job_type
 * @return {boolean} error
 */
exports.jobCancel = function(job_type) {
  var error = false;

  switch (job_type) {
    case 'getfbevents':
      //call cancel job function
      log.info({
        job: job_type,
        name: 'getfbevents'
      }, 'Cancel scheduled job!');
      if (jobsArray[0] === undefined) {
        log.error('Cannot cancel job - instance not found!');
        error = true;
      } else {
        jobsArray[0].cancel();
        // clear array ref
        jobsArray[0] = null;
      }
      break;
    case 'feedfbevents':
      //call cancel job function
      log.info({
        job: job_type,
        name: 'feedfbevents'
      }, 'Cancel scheduled job!');
      if (jobsArray[1] === undefined) {
        log.error('Cannot cancel job - instance not found!');
        error = true;
      } else {
        jobsArray[1].cancel();
        // clear array ref
        jobsArray[1] = null;
      }
      break;
    default:
      log.error("Cannot find scheduled job type to cancel!");
      error = true;
  }
  return !error;
}

/**
 * @function
 * @desc - get status of scheduled job
 * @param {string} job_type
 * @return {boolean} true, if running | false, otherwise
 */
exports.jobStatus = function(job_type) {
  switch (job_type) {
    case 'getfbevents':
      //call function
      if ((jobsArray[0] === undefined) || (jobsArray[0] === null))
        return false;
      else
        return true;
      break;
    case 'feedfbevents':
      //call function
      if ((jobsArray[1] === undefined) || (jobsArray[1] === null))
        return false;
      else
        return true;
      break;
    default:
      log.error("Cannot find scheduled job type status!");
  }
}

/**
 * @function
 * @desc - execute job without scheduling it
 * @param {string} job_type
 * @return
 */
exports.jobTest = function(job_type) {
  switch (job_type) {
    case 'getfbevents':
      //call function directly
      if (access_token.length == 0) getToken(fbgetevents);
      else fbgetevents();
      break;
    case 'feedfbevents':
      if (access_token.length == 0) getToken(fbfeedevents);
      else fbfeedevents();
      break;
    default:
      log.error("No test executed!");
  }
}

 /**
 * @function
 * @desc - get FB events job
 * @param 
 * @return
 */
function fbgetevents() {
  //console.log("Schedule Job - access token: " + access_token);
  var j = schedule.scheduleJob(read_events_rule, function() {
    log.info('Get FB events!!');

    //set access token
    FB.setAccessToken(access_token);

    //get fql query string from file
    var qfile = path.join(__dirname, 'evtQueries.txt');
    var evtQueryStrArray = fs.readFileSync(qfile, 'utf8').toString().split(';');
    for (var k in evtQueryStrArray) {
      var s = evtQueryStrArray[k].replace(/\r\n/gi, '');
      if (s.match(/select/gi) != null) break; // break on first valid query    
    }

    // Execute FQL query
    FB.api('fql', {
      q: s
    }, function(res) {
      if (!res || res.error) {
        log.info({
          error: res.error,
          query: s
        }, 'FQL execution problem!');
        return;
      }
      var evtData = res.data;
      //console.log(evtData);

      // Read FB event schema file
      var sfile = path.join(__dirname, 'evtDataSchema.json');
      var evtDataSchemaStr = fs.readFileSync(sfile, 'utf8');

      if (evtDataSchemaStr.length) {
        var evtDataSchema = JSON.parse(evtDataSchemaStr);
        // Validate JSON object
        var res = validate(evtData, evtDataSchema);
        if (res.errors.length != 0) {
          for (var i in res.errors)
            log.error({error: res.errors[i]}, 'Error parsing event data.');
          return;
        } else {
          if (evtData.length > 0) {
            // call mongodb function to store object array
            store.saveevents(evtData);
          } else
            log.info("Query result no data!!");
        }
      } else {
        log.error("Problem openning FB event schema file!!");
        return;
      }
    });
  });
  return j;
};

/**
 * @function
 * @desc - publish FB events job
 * @param 
 * @return
 */
function fbfeedevents() {
  var j = schedule.scheduleJob(feed_events_rule, function() {
    console.log('Feed FB events!!');
    FB.setAccessToken(access_token);

    // Read events to publish
    store.listpublishevents(function(evtList) {
      //console.log("List events to publish");
      //console.dir(evtList);
      evtList.forEach(function(evt) {
        // Get event details
        store.getevent(evt.eid, function(evtData) {
          // Publish the event
          //console.log("Event in publish list:" + evt.eid);
          //console.dir(evt);

          if (!evt.published) {
            var body = 'Event: ' + evtData[0].name + ' Date: ' + formattedTime(evtData[0].start_time) + ' Details (https://www.facebook.com/' + evtData[0].eid + ')';
            FB.api('Dancinghub/feed', 'post', {
              message: body
              /************************************************************************
              display: 'page',
              message: 'DancingHub Event',
              from: '1464487650445323',
              link: 'https://www.facebook.com/'+evtData[0].eid,
              picture: evtData[0].pic,
              name: evtData[0].name,
              description: evtData[0].description
              **************************************************************************/
            }, function(res) {
              if (!res || res.error) {
                log.error(res, 'Error publishing event.');
                return;
              } else {
                //console.log('Post Id: ' + res.id);
                store.updatepublishevents(evt.eid, function(doc) {
                  log.info({event_id: evt.eid}, 'Event Published.');
                });
              }
            });
          }
        });
      });
    });
  });
  return j;
}

/**
 * @function
 * @desc - get FB session token
 * @param 
 * @return
 */
function getToken() {
  // Read FB token schema file
  var sfile = path.join(__dirname, 'oauth-fb-schema.json');
  var oauthSchemaStr = fs.readFileSync(sfile, 'utf8');

  if (oauthSchemaStr.length) {
    var oauthDataSchema = JSON.parse(oauthSchemaStr);
  } else {
    log.error("Error openning FB oauth schema file!!");
    return "";
  }
  // Read FB token file
  var file = path.join(__dirname, 'oauth-fb.json');
  //console.log("Read file: "+file);  
  var oauthDataStr = fs.readFileSync(file, 'utf8');

  if (oauthDataStr.length) {
    var oauthData = JSON.parse(oauthDataStr);
    var res = validate(oauthData, oauthDataSchema);
    if (res.errors.length != 0) {
      for (var i in res.errors)
        log.error({error: res.errors[i]}, 'Error parsing oauth data.');
      return "";
    }
  } else {
    log.error("Error openning oauth token file!!");
    return "";
  }

  // Test if getToken contains callback
  if (arguments.length == 1) {
    //if (Object.prototype.toString.call(arguments[0]) === "[object Function]")
    if (typeof arguments[0] === 'function') {
      log.info("getToken callback detected!!");
      var callback = arguments[0];
    }
  }

  //console.log("Token for id: " + oauthData.id);
  //console.log("Token string: " + oauthData.accessToken);

  // set access token
  access_token = oauthData.accessToken;

  // if call callback then execute it
  if (typeof callback === 'function') {
    log.info("Callback found to be called from getToken!!");
    //Execute callback
    callback();
  } else {
    log.info("No callback to be called from getToken!!");
  }

  // return access token
  return oauthData.accessToken;
}

/**
 * @function
 * @desc - format date&time 
 * @param {String} dateString
 * @return {String} formatted date string
 */
function formattedTime(dateString) {
  var d = new Date(dateString * 1000);
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
}

/**
 * @function
 * @desc - pad left zero if necessary 
 * @param 
 * @return 
 */
function pad(n) {
  return n < 10 ? '0' + n : n;
}