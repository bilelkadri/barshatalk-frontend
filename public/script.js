const socket = io("https://barshatalk-text-server.onrender.com");

// UI elements
// Corrected: Removed welcomeScreen reference as it's not in text_corrected.html
// const welcomeScreen = document.getElementById("welcomeScreen"); 
const chatScreen = document.getElementById("chatScreen");
const sendBtn = document.getElementById("sendBtn");
// Corrected: Changed ID from disconnectBtn to nextBtn to match text_corrected.html
const nextBtn = document.getElementById("nextBtn"); 
const messageInput = document.getElementById("messageInput");
const messages = document.getElementById("messages");

// Add message sent sound
// Corrected: Using the sound element from text_corrected.html
const messageSound = document.getElementById("sendSound"); 
const disconnectSound = document.getElementById("disconnectSound"); // Added for potential use

// Handle UI - Simplified as this script is only for text.html
console.log("Text chat script loaded.");

// Socket setup for TEXT CHAT ONLY
socket.on("connect", () => {
  console.log("Connected to text chat server");
  // Update status text if needed
  const statusText = document.getElementById("statusText");
  if (statusText) statusText.textContent = "✅ Connected, waiting for partner...";
});

socket.on("connect_error", (error) => {
    console.error("Text chat Socket.IO connection error:", error);
    appendMessage("⚠️ Connection error to text chat server.");
    const statusText = document.getElementById("statusText");
    if (statusText) statusText.textContent = "❌ Connection Error";
});

socket.on("matched", () => { // Assuming server emits 'matched'
  appendMessage("🎉 Partner found! Start chatting.");
  const statusText = document.getElementById("statusText");
  if (statusText) statusText.textContent = "🟢 Chatting with a stranger";
});

socket.on("waiting", () => {
  appendMessage("⏳ Waiting for a text chat partner...");
  const statusText = document.getElementById("statusText");
  if (statusText) statusText.textContent = "⏳ Waiting for a partner...";
});

// Check if sendBtn exists before adding onclick
if (sendBtn) {
    sendBtn.onclick = () => {
      const msg = messageInput.value;
      if (msg.trim()) {
        appendMessage("You: " + msg);
        socket.emit("message", msg); 
        messageInput.value = "";
        if (messageSound) messageSound.play(); 
      }
    };
} else {
    console.error("Send button (sendBtn) not found!");
}

// Check if nextBtn exists before adding onclick
if (nextBtn) {
    nextBtn.onclick = () => {
      console.log("Next button clicked");
      appendMessage("🏃 You requested the next partner...");
      if (disconnectSound) disconnectSound.play();
      // Emit 'next' event to the server to handle partner change
      socket.emit("next"); 
      // Server should handle putting user back in waiting queue and notifying old partner
      // Client side just waits for 'waiting' or 'matched' event from server
      const statusText = document.getElementById("statusText");
      if (statusText) statusText.textContent = "⏳ Finding next partner...";
      // Clear previous messages for the new chat
      messages.innerHTML = ''; 
      appendMessage("⏳ Waiting for a new text chat partner...");
    };
} else {
    console.error("Next button (nextBtn) not found!");
}


socket.on("message", (msg) => {
  appendMessage("Stranger: " + msg);
});

socket.on("partnerDisconnected", () => {
    appendMessage("❌ Partner disconnected. Waiting for a new one...");
    const statusText = document.getElementById("statusText");
    if (statusText) statusText.textContent = "❌ Partner left. Waiting...";
    // Server should automatically put this user back in the waiting queue
});


// Message box
function appendMessage(msg) {
  if (messages) {
      messages.innerHTML += `<div class="system-message">${msg}</div>`; // Added class for styling
      messages.scrollTop = messages.scrollHeight;
  } else {
      console.error("Messages container not found!");
  }
}

// Emoji Picker Logic (from text.html)
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');

if (emojiBtn && emojiPicker && messageInput) {
    emojiBtn.onclick = () => {
        emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
    };

    emojiPicker.addEventListener('emoji-click', event => {
        messageInput.value += event.detail.unicode;
        emojiPicker.style.display = 'none';
    });
} else {
    console.error("Emoji button, picker, or message input not found!");
}


