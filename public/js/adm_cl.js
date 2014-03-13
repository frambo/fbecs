var socket;
var myClientId;
var jobStatus = ['Undefined', 'Undefined'];

function enableToggleButton(target, enable) {
  if (target == 'All' || target == 'job1') {
    $('button#toggle1').prop('disabled', !enable);
  }
  if (target == 'All' || target == 'job2') {
    $('button#toggle2').prop('disabled', !enable);
  }
}

function setFeedback(fb) {
  $('span#feedback').html(fb);
}

function getResultStatus(target, result) {
  console.log('Status Result received: [' + target + '::' + result + ']');
  var split = result.split(';');
  if (target == 'All' || target == 'job1') {
    // set status for job#1
    if (split[0] != '*') $('label#job1Status').text(split[0]);
  }
  if (target == 'All' || target == 'job2') {
    // set status for job#2
    if (split[1] != '*') $('label#job2Status').text(split[1]);
  }
}

function getResultToggle(target, result) {
  console.log('Toggle Result received: [' + target + '::' + result + ']');
}

function updateStatus(target) {
  if (target == 'All' || target == 'job1') {
    // set status for job#1
    $('label#job1Status').value(jobStatus[0]);
  }
  if (target == 'All' || target == 'job2') {
    // set status for job#2
    $('label#job2Status').value(jobStatus[1]);
  }
}

/*
 * Request functions: connection, status and toggle
 */

function connectionRequest() {
  myClientId = Math.floor((Math.random() * 1000000000) + 1);
  socket.emit('connRequest', myClientId, function(data) {
    console.log('emit connection request: ', data);
  });
  console.log('Set client id: ' + myClientId);
}

function statusRequest(target) {
  socket.emit('cmdRequest', {
    "source": myClientId,
    "target": target,
    "command": 'status'
  });
  console.log('Status Request: ' + target);
}

function toggleRequest(target) {
  socket.emit('cmdRequest', {
    "source": myClientId,
    "target": target,
    "command": 'toggle'
  });
  console.log('Toggle Request: ' + target);
}

/*
 * Main function
 */
$(function() {
  // setup jQuery listeners
  $('button#toggle1').click(function() {
    // send start/stop command
    // disable button until ack result
    $('button#toggle1').prop('disabled', true);
    toggleRequest('job1');
  });

  $('button#toggle2').click(function() {
    // send start/stop command
    // disable button until ack result
    $('button#toggle2').prop('disabled', true);
    toggleRequest('job2');
  });


  // Disable command buttons - wait for connection to server
  enableToggleButton('All', false);

  // setup socket
  socket = io.connect("http://localhost:3000");

  /*
   * setup handlers to handle server replies
   */

  // Handle connection reply
  socket.on('connReply', function(msg) {
    if (msg.source != myClientId) {
      alert('Reply to other client, not me !???');
      return;
    }
    if (msg.reply == 'ack') {
      setFeedback("<span style='color: blue'> Administration connection available.</span>");
      // Get status of all jobs
      statusRequest('All');
    } else
      setFeedback("<span style='color: red'> Administration already in use. Try later.</span>");
  });

  // Handle command replies (commands: status, toggle)
  socket.on('cmdReply', function(msg) {
    if (msg.source != myClientId) {
      alert('Reply to other client, not me !???');
      return;
    }

    switch (msg.command) {
      case 'status':
        if (msg.reply == 'ack') {
          setFeedback("<span style='color: blue'> Job status command ack.</span>");
          // Update page job status
          getResultStatus(msg.target, msg.result);
          // Enable toggle button
          enableToggleButton(msg.target, true);
        } else
          setFeedback("<span style='color: red'> Could not get job status.</span>");
        break;
      case 'toggle':
        if (msg.reply == 'ack') {
          setFeedback("<span style='color: blue'> Job toggle command ack.</span>");
          // Update page job status
          getResultToggle(msg.target, msg.result); // not really necessary
          // Get status of toggled job(s), but wait for 10secs
          setTimeout(function() {
            statusRequest(msg.target);
          }, 5000);
        } else
          setFeedback("<span style='color: red'> Could not get job toggle.</span>");
        break;
      default:
        setFeedback("<span style='color: red'> Error: command not recognized!!</span>");
    }
    if (msg.reply == 'ack') {
      setFeedback("<span style='color: blue'> Job status updated.</span>");
      // Update page job status
    } else
      setFeedback("<span style='color: red'> Could not get job status.</span>");
  });

  socket.on('error', function(msg) {
    if (msg.inUse) {
      setFeedback("<span style='color: red'> Administration already in use. Try later.</span>");
    }
  });

  // request admin connection
  connectionRequest();
});