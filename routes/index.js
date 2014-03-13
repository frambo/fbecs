var store = require('../store.js');

/*
 * GET home page.
 */

exports.index = function(req, res) {
  if (req.user === undefined)
    res.render('index', {
      title: 'ECS Express',
      user: null
    });
  else
    res.render('index', {
      title: 'ECS Express',
      user: req.user
    });
}

exports.fbevtlist = function(req, res) {
  if (req.query.filter === undefined) {
    var qfilter = 'All';
  } else {
    var qfilter = req.query.filter;
  }

  store.listevents(qfilter, function(evtList) {
    res.render('fbevtlist_v1', {
      title: 'ECS Express',
      filter: qfilter,
      items: evtList
    });
  });
}

exports.fbevtdetails = function(req, res) {
  store.getevent(req.query.id, function(evtList) {
    console.dir(evtList);
    res.render('fbevtdetails_v1', {
      title: 'ECS Express',
      item: evtList[0]
    });
  });
}

exports.fblog = function(path, fs) {
  return function(req, res) {
    /**
  var itemsLog = [{date:"01-02-2013", topic:"Use bootstart to set CSS templates."}, 
              {date:"01-02-2013", topic:"Other stuff I want to do..."}];
  **/
    // Read config file - valid for windows
    var logfile = path.join(path.resolve('.'), 'todoLog.json');
    console.log("Read logfile: " + logfile);
    var itemsLogStr = fs.readFileSync(logfile, 'utf8');
    //console.log(itemsLogStr); 

    if (itemsLogStr.length) {
      var itemsLog = JSON.parse(itemsLogStr);
      console.dir(itemsLog);
    } else {
      console.log("Error openning todo log file!!");
    }

    res.render('fblog', {
      title: 'FB Log Page',
      items: itemsLog
    });
  };
}

exports.publish = function(req, res) {
  // Get our form values. These rely on the "name" attributes
  var evtData = {
    eid: req.body.eid,
    name: req.body.name
  }
  console.log("Publish Event:");
  console.dir(evtData);

  store.savepublishevent(evtData, function(doc) {
    // If it worked, forward back to event list page
    console.log("Exit from savepublishevent");
  });
  
  res.redirect("fbevtlist");
  res.location("fbevtlist");
}