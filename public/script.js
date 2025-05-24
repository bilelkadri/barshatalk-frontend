const socket = io("https://barshatalk-text-server.onrender.com");

// UI elements
const welcomeScreen = document.getElementById("welcomeScreen");
const chatScreen = document.getElementById("chatScreen");
// Remove video elements references if they are not used for text chat UI
// const localVideo = document.getElementById("localVideo");
// const remoteVideo = document.getElementById("remoteVideo");
const sendBtn = document.getElementById("sendBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const messageInput = document.getElementById("messageInput");
const messages = document.getElementById("messages");

// Add message sent sound
const messageSound = new Audio("https://cdn.glitch.global/498eeaf2-e9b7-4a5d-bb55-137a5bc68843/notification-5-337824.mp3?v=1746932737989");

// Handle UI
// This function might need adjustment depending on how text/video modes are selected in index.html
function startChat(mode) {
  // Assuming this script is only for text chat page (text.html)
  // If it's loaded on video.html too, this needs more logic
  if (mode === "text") {
      welcomeScreen.classList.remove("active");
      chatScreen.classList.add("active");
      // socket.connect(); // io() usually connects automatically
      console.log("Attempting to connect to text chat server...");
  }
}

// Socket setup for TEXT CHAT ONLY
socket.on("connect", () => {
  console.log("Connected to text chat server");
  // Maybe emit a 'ready' event for text chat here if the server expects it
});

socket.on("connect_error", (error) => {
    console.error("Text chat Socket.IO connection error:", error);
    appendMessage("⚠️ Connection error to text chat server.");
});

socket.on("partner-found", () => {
  appendMessage("🎉 Partner found for text chat!");
  // No video logic here
});

socket.on("waiting", () => {
  appendMessage("⏳ Waiting for a text chat partner...");
});

sendBtn.onclick = () => {
  const msg = messageInput.value;
  if (msg.trim()) {
    appendMessage("You: " + msg);
    socket.emit("message", msg); // Ensure server expects 'message' event
    messageInput.value = "";
    messageSound.play(); // Play sound when message is sent
  }
};

disconnectBtn.onclick = () => {
  socket.disconnect();
  // Consider redirecting or just showing welcome screen instead of reload
  window.location.reload();
};

socket.on("message", (msg) => {
  appendMessage("Stranger: " + msg);
});

// Removed WebRTC signaling listeners (offer, answer, ice-candidate)

// Message box
function appendMessage(msg) {
  messages.innerHTML += `<div>${msg}</div>`;
  messages.scrollTop = messages.scrollHeight;
}

// Removed video functions (startVideoChat, createPeerConnection)

// If startChat is called from HTML, ensure it's called with 'text' mode
// e.g., <button onclick="startChat('text')">Start Text Chat</button>


