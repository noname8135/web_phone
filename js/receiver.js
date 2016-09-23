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

var pickupButton = document.getElementById('pickupButton');
var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

/////////////////////////////////////////////

var room = 'shuai';  //use consultant id in product ver.
var socket = io.connect();

if (room !== '') {
  socket.emit('join request', {id:'B', room:room}, function(ready){
    //if(ready === true)
    //else
      ;
  } ); //send identity and related data
}

socket.on('ready',function(){
  ; ////
});

socket.on('state',function(if_caller_connected){
  /*if(if_caller_connected == true)
    ...
  else
    ...*/
});

socket.on('received', function(){
  console.log('call received');
  pickupButton.disabled = false;
  document.getElementById('msg_area').innerHTML = 'Someone\'s calling~!!';
});

socket.on('remote hangup', function(){
  hangup(true);
});
  
socket.on('message', function(message) {
  console.log('Client received message:', message);
  if (message.type === 'offer') {
    createPeerConnection();
    pc.addStream(localStream);
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } 
  else if (message.type === 'candidate') {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  } 
});

function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function pickup(){
  console.log('Picked up!!!')
  socket.emit('picked up');
  pickupButton.disabled = true;
}

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
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

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteVideo.src = window.URL.createObjectURL(event.stream);
  remoteStream = event.stream;
  msg_area.innerHTML = 'Call established';
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function init(){  //initialize all elements
  msg_area.innerHTML = 'Waiting for call..';
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
  if (isInitiator) {
    maybeStart();
  }
}
init();

navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true
})
.then(gotStream)
.catch(function(e) {
  alert('getUserMedia() error: ' + e.name);
});

window.onbeforeunload = function() {
  hangup(false);
};