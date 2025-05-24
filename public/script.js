const socket = io("https://barshatalk-text-server.onrender.com");

let localStream;
let remoteStream;
let peerConnection;
let chatMode = null;

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// UI elements
const welcomeScreen = document.getElementById("welcomeScreen");
const chatScreen = document.getElementById("chatScreen");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const sendBtn = document.getElementById("sendBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const messageInput = document.getElementById("messageInput");
const messages = document.getElementById("messages");

// Add message sent sound
const messageSound = new Audio("https://cdn.glitch.global/498eeaf2-e9b7-4a5d-bb55-137a5bc68843/notification-5-337824.mp3?v=1746932737989");

// Handle UI
function startChat(mode) {
  chatMode = mode;
  welcomeScreen.classList.remove("active");
  chatScreen.classList.add("active");
  socket.connect();
}

// Socket setup
socket.on("connect", () => {
  console.log("Connected to server");
});

socket.on("partner-found", async () => {
  appendMessage("🎉 Partner found!");
  if (chatMode === "video") {
    await startVideoChat();
  }
});

socket.on("waiting", () => {
  appendMessage("⏳ Waiting for a partner...");
});

sendBtn.onclick = () => {
  const msg = messageInput.value;
  if (msg.trim()) {
    appendMessage("You: " + msg);
    socket.emit("message", msg);
    messageInput.value = "";
    messageSound.play(); // Play sound when message is sent
  }
};

disconnectBtn.onclick = () => {
  socket.disconnect();
  window.location.reload();
};

socket.on("message", (msg) => {
  appendMessage("Stranger: " + msg);
});

// WebRTC signaling
socket.on("offer", async (offer) => {
  if (!peerConnection) await createPeerConnection();

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", answer);
});

socket.on("answer", async (answer) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("ice-candidate", (candidate) => {
  if (peerConnection) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }
});

// Message box
function appendMessage(msg) {
  messages.innerHTML += `<div>${msg}</div>`;
  messages.scrollTop = messages.scrollHeight;
}

// Start Video Chat
async function startVideoChat() {
  await createPeerConnection();

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  localStream
    .getTracks()
    .forEach((track) => peerConnection.addTrack(track, localStream));
  localVideo.srcObject = localStream;

  remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", offer);
}

// Create Peer Connection
async function createPeerConnection() {
  peerConnection = new RTCPeerConnection(config);

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", event.candidate);
    }
  };

  peerConnection.ontrack = (event) => {
    remoteStream.addTrack(event.track);
  };
}
