var express = require('express');
var bodyParser = require('body-parser');
var xmpp = require('node-xmpp');
var util = require("util");
var request = require('request'); // github.com/mikeal/request

var app = express();
app.use(bodyParser());

// Config (get details from https://www.hipchat.com/account/xmpp)
var jid = "bot@maksim.local";
var password = "123123123";
var room_jid = "sw@conference.maksim.local";
var room_nick = "bot";
 
var cl = new xmpp.Client({
  jid: jid + '/bot',
  password: password
});
 
// Log all data received
cl.on('data', function(d) {
 util.log("[data in] " + d);
});
 
// Once connected, set available presence and join room
cl.on('online', function() {
  util.log("We're online!");
 
  // set ourselves as online
  cl.send(new xmpp.Element('presence', { type: 'available' }).
    c('show').t('chat')
   );
 
  // join room (and request no chat history)
  cl.send(new xmpp.Element('presence', { to: room_jid+'/'+room_nick }).
    c('x', { xmlns: 'http://jabber.org/protocol/muc' })
  );

  cl.send(new xmpp.Element('message', { to: room_jid, type: 'groupchat' }).
    c('body').t('Howdy')
   );

  // send keepalive data or server will disconnect us after 150s of inactivity
  setInterval(function() {
    cl.send(' ');
  }, 30000);
});

cl.on('stanza', function(stanza) {
  // always log error stanzas
  if (stanza.attrs.type == 'error') {
    util.log('[error] ' + stanza);
    return;
  }
 
  // ignore everything that isn't a room message
  if (!stanza.is('message') || !stanza.attrs.type == 'groupchat') {
    return;
  }
 
  // ignore messages we sent
  if (stanza.attrs.from == room_jid+'/'+room_nick) {
    return;
  }
 
  var body = stanza.getChild('body');
  // message without body is probably a topic change
  if (!body) {
    return;
  }
});

app.get('/', function (req, res) {
    cl.send(new xmpp.Element('message', { to: room_jid, type: 'groupchat' }).
    c('body').t('Someone hit the stack')
   );
    res.send('Howdy');
}).post('/', function (req, res) {
    var message;
    if (req.body.object_kind === 'merge_request') {
        var attributes = req.body.object_attributes;
        message = "";
        message += "User ";
        message += attributes.author_id;
        message += " requested merge request to ";
        message += attributes.target_branch;
        cl.send(new xmpp.Element('message', {to: room_jid, type: 'groupchat'}).
            c('body').t(message));
    } else {
        message = "";
        message += "User ";
        message += req.body.user_name;
        message += " made a commit to ";
        message += req.body.repository.name;
        cl.send(new xmpp.Element('message', {to: room_jid, type: 'groupchat'}).
            c('body').t(message));
    }
    res.send('OK');
});


app.listen(3000);