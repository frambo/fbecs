/**
 * Module handling the persistency using MongoDB
 * @module 
 */
var path = require('path');
var fs = require('fs');
var validate = require('jsonschema').validate;
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/fbecsdb');


/**
 * @function
 * @desc - save events in database
 * @param {Object} evtData 
 * @return
 */
exports.saveevents = function(evtData) {
  // Set our collection
  var collection = db.get('fbevtcollection');

  // Submit insert/update to the DB
  // Note: could not find an bulk insert/update, so will do it with loop
  var rec_cnt = 0;
  for (var k in evtData) {
    // console.dir(evtData[k]);
    // Try to find obj in db
    // - if found and updatime is different, then update record
    // - if not-found then insert  
    collection.update({
      eid: evtData[k].eid
    }, evtData[k], {
      upsert: true
    }, function(e, doc) {
      if (e) {
        // If it failed, return error
        log.error(e, 'Error adding events to the database');
      } else {
        rec_cnt = rec_cnt + 1;
        //console.log("Information successfully added to the database.");
      }
    });
  }
  log.info({total_records: rec_cnt}, "Events added to database");
};


 /**
 * @function
 * @desc - list events in database
 * @param {String} filter
 * @param {object} callback function
 * @return
 */
exports.listevents = function(filter, cb) {
  // Set our collection
  var collection = db.get('fbevtcollection');
  // unix timestamp
  var dateNow = Math.round(+new Date()/1000);
  //console.log("Filter = " + filter + ",  Today = " + dateNow.toString());
  
  // Set filter for event query
  switch (filter) {
    case 'Month':
      // Month = [today, today+30days]
      var sDate = dateNow;
      var fDate = dateNow+(30*86400);
      var queryInterval = { start_time: {$gt: sDate, $lt: fDate}};
      break;
    case 'Week':
      // Week = [today, today+7days]
      var sDate = dateNow;
      var fDate = dateNow+(7*86400);
      var queryInterval = { start_time: {$gt: sDate, $lt: fDate}};
      break;
    case 'Day':
      // Today
      var sDate = dateNow;
      var fDate = dateNow+86400;
      var queryInterval = { start_time: {$gt: sDate, $lt: fDate}};
      break;
    case 'All':
    default:
      // no filter for the query.
      var queryInterval = {};
  }

  // List events in db
  collection.find(queryInterval, {}, function(e, docs) {
    if (e) {
      // If it failed, return error
      log.error(e, 'Error listing events from database');
      return;
    } else {
      log.info("Information successfully listed from the database.");
      cb(docs);
      return;
    }
  });
};


 /**
 * @function
 * @desc - get event from database
 * @param {String} id
 * @param {object} callback function
 * @return
 */
exports.getevent = function(id, cb) {
  // Set our collection
  var collection = db.get('fbevtcollection');

  // List events in db
  collection.find({
    eid: parseInt(id)
  }, {}, function(e, docs) {
    if (e) {
      // If it failed, return error
      log.error(e, 'Error getting event from database');
      return;
    } else {
      if (docs.length > 0) {
        log.info({evt_id: id}, "Event found in database.");
        cb(docs);
      } else
        log.info({evt_id: id}, "Event NOT found in database.");
      return;
    }
  });
};


 /**
 * @function
 * @desc - save events to be published
 * @param {Object} evtData 
 * @param {object} callback function
 * @return
 */
exports.savepublishevent = function(evtData, cb) {
  // Set our collection
  var collection = db.get('fbevtpublishcollection');

  // Insert event if not existing
/****************************************************************************************
  collection.update({
    query: { eid: evtData.eid },
    update: { $setOnInsert: { eid: evtData.eid, name: evtData.name, published: false}},
    new: true,   // return the modified (or upserted) doc, not the original.
    upsert: true // insert the document if it does not exist
    },
    function(e, doc) {
      if (e) {
        // If it failed, return error
        console.log("There was a problem adding the information to the database.");
        console.dir(e);
        return;
      } else {
        cb(doc);
        return;
      }
    }
  );  
******************************************************************************************/

  collection.update({
      eid: evtData.eid
    }, {
      eid: evtData.eid,
      name: evtData.name,
      published: false
    }, {
      upsert: true
    },
    function(e, doc) {
      if (e) {
        // If it failed, return error
        log.error(e, 'Error saving events to be published.');
        return;
      } else {
        cb(doc);
        return;
      }
    }
  );

};


 /**
 * @function
 * @desc - list events to be published
 * @param {object} callback function
 * @return
 */
exports.listpublishevents = function(cb) {
  // Set our collection
  var collection = db.get('fbevtpublishcollection');

  // List events in db
  collection.find({}, {}, function(e, docs) {
    if (e) {
      // If it failed, return error
      log.error(e, 'Error listing events to be published.');
      return;
    } else {
      cb(docs);
      return;
    }
  });
};

 /**
 * @function
 * @desc - update events to be published
 * @param {String} event_id 
 * @param {object} callback function
 * @return
 */
exports.updatepublishevents = function(event_id, cb) {
  // Set our collection
  var collection = db.get('fbevtpublishcollection');

  collection.update({eid: event_id}, {$set: {published: true}}, {},
    function(e, doc) {
      if (e) {
        // If it failed, return error
        log.error(e, 'Error updating events to be published.');
        return;
      } else {
        cb(doc);
        return;
      }
    }
  );
};