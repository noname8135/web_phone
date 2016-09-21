'use strict';

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;

var pcConfig = {
  'iceServers': [{
    url: 'stun:stun.l.google.com:19302',    
  },
  {
    url: 'turn:numb.viagenie.ca',
    credential: 'muazkh',
    username: 'webrtc@live.com'
  },
  {
    url: 'turn:192.158.29.39:3478?transport=udp',
    credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
    username: '28224511:1379330808'
  },
  {
    url: 'turn:192.158.29.39:3478?transport=tcp',
    credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
    username: '28224511:1379330808'
  }]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  'mandatory': {
    'OfferToReceiveAudio': true,
    'OfferToReceiveVideo': true
  }
};

/////////////////////////////////////////////

var room = 'shuai'; //= prompt('Enter room name:');
// Could prompt for room name:

var socket = io.connect();


var msg_area = document.getElementById('msg_area');
var callButton = document.getElementById('callButton');
var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true
})
.then(gotStream)
.catch(function(e) {
  alert('getUserMedia() error: ' + e.name);
});

if (room !== '') {
  socket.emit('join request', {id:'A', room:room}, function(ready){
    console.log('ready:',ready);
    if(ready === true){
      msg_area.innerHTML = 'Receiver connected..You can call now';
      callButton.disabled = false;
    }
  } ); //send identity and related data
}

function startCall(){
  socket.emit('ring',room);
  callButton.disabled = true;
  msg_area.innerHTML = 'Waiting for pickup...';
}

//////socket.io event handlers//////// 
socket.on('ready',function(){
  msg_area.innerHTML = 'Receiver connected..You can call now';
  callButton.disabled = false;
});

socket.on('picked up', function(){
  console.log('Call is picked up');
  msg_area.innerHTML = '';
  doCall();
});

socket.on('full', function(room) {
  console.log('Room ' + room + ' is full');
});

socket.on('remote hangup', function(){
  hangup(true);
});

socket.on('message', function(message) {
  console.log('Client received message:', message);
  if (message.type === 'answer') {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  }
  else if (message.type === 'candidate') {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  } 
});

//////other functions/////////

function doCall() {
  console.log('Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function init(){  //initialize all elements
  callButton.disabled = true; //
  msg_area.innerHTML = 'waiting for receiver to cotruennect...';
}

function hangup(from_remote){
  init(); //clear everything to initial state~
  console.log('Hanging up.');
  pc.close();
  pc = null;
  if(from_remote === false)
    socket.to(room).emit('hangup');
}

function gotStream(stream) {
  console.log('Adding local stream.');
  localVideo.src = window.URL.createObjectURL(stream);
  localStream = stream;
  createPeerConnection();
  pc.addStream(localStream);
}

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
  }
}

function handleRemoteStreamAdded(event) {
  console.log('event ===> ', event);
  console.log('Remote stream added.');
  remoteVideo.src = window.URL.createObjectURL(event.stream);
  remoteStream = event.stream;
  msg_area.innerHTML = 'Call established';
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

init();

window.onbeforeunload = function() {
  hangup(false);
};

/*

///////////////////////////////////////////

  sig_handler(){  //wait for pickup
    set_flag = true
  }
  flag = false;
  end = now()+n s
  while now < end:
    ..... // wait n sec
    if flag:
      // do something 
  bye();
*/