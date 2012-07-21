var socket = io.connect('http://10.242.11.185');
var state = {
  localStream: null,
  initiator: false,
  started: false,
  channelReady: false
};

var uglyGlobal;

function init() {
  initCanvas();
  initButtons();
  initSockets();
  initMedia();
}

function initCanvas() {
  var photo = document.getElementById("photo");
  var video = document.getElementById("vidcam");

  /*
  photo.width = video.width;
  photo.height = video.height;
  */

  photo.width = photo.height = 500;
}

function initButtons() {
  document.getElementById("normal").addEventListener('click', function(e) {
    clearInterval(uglyGlobal);
    document.getElementById("vidcam").style["-webkit-filter"] = "";
  });
  document.getElementById("sepia").addEventListener('click', function(e) {
    clearInterval(uglyGlobal);
    document.getElementById("vidcam").style["-webkit-filter"] = "sepia(1)";
  });
  document.getElementById("bizarre").addEventListener('click', function(e) {
    clearInterval(uglyGlobal);
    uglyGlobal = setInterval(function() {
      document.getElementById("vidcam").style["-webkit-filter"] = "hue-rotate(" + ((+new Date) % 360) + "deg)";
    }, 20);
  });
}

function takePhoto()
 {
   var c = document.getElementById('photo');
   var v = document.getElementById('vidcam');
   c.getContext('2d').drawImage(v, 0, 0);
 }


function initSockets() {
  socket.on('become initiator', function() {
    state.initiator = true;
  });

  socket.on('receive ice candidate', function(data) {
    maybeStart(); // ?
    var candidate = new IceCandidate(data.label, data.candidate);
    pc.processIceMessage(candidate);
  });

  socket.on('receive offer', function(msg) {
    if (!state.initiator && !state.started) {
      maybeStart(); 
    }

    pc.setRemoteDescription(pc.SDP_OFFER, new SessionDescription(msg.sdp));
    doAnswer();
  });
  

  socket.on('receive answer', function(msg) {
    pc.setRemoteDescription(pc.SDP_ANSWER, new SessionDescription(msg.sdp));
  });

  socket.on('channel opened', onChannelOpened);
}

function initMedia() {
  if(navigator.webkitGetUserMedia)  {  
    navigator.webkitGetUserMedia({video: true}, onSuccess, onFail);  
  } else {  
    alert('webRTC not available');  
  }  
}

function onSuccess(stream) {  
  document.getElementById('vidcam').src = webkitURL.createObjectURL(stream);  
  state.localStream = stream;
  if (state.initiator) maybeStart();
}

function onFail() {  
  alert('could not connect stream');  
}

function createPeerConnection() {
  try {
    pc = new webkitPeerConnection00("STUN stun.l.google.com:19302", onIceCandidate);
    console.log("Created PeerConnection with stun.l.google.com:19302.");
  } catch (e) {
    console.log("Failed to create PeerConnection, exception: " + e.message);
    alert("Cannot create PeerConnection object; Is the 'PeerConnection' flag enabled in about:flags?");
    return;
  }

  pc.onaddstream = onRemoteStreamAdded;
}

function maybeStart() {
  if (!state.started && state.localStream && state.channelReady) {
    console.log("Creating PeerConnection.");
    createPeerConnection();
    console.log("Adding local stream.");
    pc.addStream(state.localStream);
    state.started = true;
    // Caller initiates offer to peer.
    if (state.initiator)
      doCall();
  }
}

function onIceCandidate(candidate, moreToFollow) {
  if (candidate) {
    socket.emit('ice candidate', {
      type: "candidate",
      label: candidate.label,
      candidate: candidate.toSdp()
    });
  }
}

function onChannelOpened() {
  console.log('Channel opened.');
  state.channelReady = true;
  if (state.initiator) maybeStart();
}

function onRemoteStreamAdded(event) {
  console.log("Remote stream added.");
  var url = webkitURL.createObjectURL(event.stream);
  document.getElementById('remotecam').src = url;
}

function doCall() {
  console.log("Send offer to peer");
  var offer = pc.createOffer({video:true});
  pc.setLocalDescription(pc.SDP_OFFER, offer);
  socket.emit('send offer', {type: 'offer', sdp: offer.toSdp()});
  pc.startIce();
}

function doAnswer() {
  console.log("Send answer to peer");
  var offer = pc.remoteDescription;
  var answer = pc.createAnswer(offer.toSdp(), {audio:true,video:true});
  pc.setLocalDescription(pc.SDP_ANSWER, answer);
  socket.emit('send answer', {type: 'answer', sdp: answer.toSdp()});
  pc.startIce();
}

