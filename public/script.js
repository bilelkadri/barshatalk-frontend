// Based on the original Glitch script.js, adapted for Render backend and text.html structure

// Corrected: Connect to the specific Render text chat server URL
const socket = io("https://barshatalk-text-server.onrender.com"); 

// Removed video-related variables: localStream, remoteStream, peerConnection, config
let chatMode = "text"; // Assuming this script is only for text chat now

// UI elements (Ensure IDs match text_corrected.html)
// Removed welcomeScreen, localVideo, remoteVideo as they are not in text_corrected.html or handled elsewhere
const chatScreen = document.getElementById("chatScreen");
const sendBtn = document.getElementById("sendBtn");
// Corrected: Use "nextBtn" ID from text_corrected.html
const nextBtn = document.getElementById("nextBtn"); 
const messageInput = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const statusText = document.getElementById("statusText"); // Added status text element

// Sound elements (Ensure IDs match text_corrected.html)
// Corrected: Use IDs from text_corrected.html
const messageSound = document.getElementById("sendSound"); 
const disconnectSound = document.getElementById("disconnectSound"); 

console.log("Text chat script loaded (Based on Glitch version, adapted for Render).");

// Removed startChat function as it was mainly for mode selection and video init
// Connection happens automatically via io()

// --- Socket Event Handlers ---
socket.on("connect", () => {
  console.log("Connected to text chat server");
  if (statusText) statusText.textContent = "✅ Connected, waiting for partner...";
});

socket.on("connect_error", (error) => {
    console.error("Text chat Socket.IO connection error:", error);
    // Use the original appendMessage logic but add a system class
    appendMessage("⚠️ Connection error to text chat server.", "system"); 
    if (statusText) statusText.textContent = "❌ Connection Error";
});

// Corrected: Use "matched" event name based on server_corrected.js
socket.on("matched", () => { 
  appendMessage("🎉 Partner found!", "system");
  if (statusText) statusText.textContent = "🟢 Chatting with a stranger";
  // Removed video start logic
});

socket.on("waiting", () => {
  appendMessage("⏳ Waiting for a partner...", "system");
  if (statusText) statusText.textContent = "⏳ Waiting for a partner...";
});

socket.on("message", (msg) => {
  // Use the original appendMessage logic but pass type
  appendMessage(msg, "stranger"); 
});

// Corrected: Use "partnerDisconnected" event name based on server_corrected.js
socket.on("partnerDisconnected", () => {
    appendMessage("❌ Partner disconnected. Waiting for a new one...", "system");
    if (statusText) statusText.textContent = "❌ Partner left. Waiting...";
});

// Removed WebRTC signaling listeners (offer, answer, ice-candidate)

// --- UI Event Handlers ---

function sendMessage() {
    const msg = messageInput.value;
    if (msg.trim()) {
        // Use the original appendMessage logic but pass type
        appendMessage(msg, "you"); 
        socket.emit("message", msg); 
        messageInput.value = "";
        if (messageSound) {
            messageSound.play().catch(e => console.error("Error playing send sound:", e));
        } else {
            console.warn("Send sound element not found");
        }
    }
}

// Send button click (with null check)
if (sendBtn) {
    sendBtn.onclick = sendMessage;
} else {
    console.error("Send button (sendBtn) not found!");
}

// Send on Enter key press (Added as requested)
if (messageInput) {
    messageInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault(); 
            sendMessage();
        }
    });
} else {
    console.error("Message input (messageInput) not found!");
}

// Next button click (using nextBtn ID, with null check)
if (nextBtn) {
    nextBtn.onclick = () => {
      console.log("Next button clicked");
      appendMessage("🏃 You requested the next partner...", "system");
      if (disconnectSound) {
          disconnectSound.play().catch(e => console.error("Error playing disconnect sound:", e));
      } else {
          console.warn("Disconnect sound element not found");
      }
      socket.emit("next"); 
      if (statusText) statusText.textContent = "⏳ Finding next partner...";
      if (messages) messages.innerHTML = 
          `<div class="system-message">⏳ Waiting for a new text chat partner...</div>`;
    };
} else {
    console.error("Next button (nextBtn) not found!");
}

// --- Message Display Function (Restores Bubble Styling Concept) ---
// This function now adds classes like the previous version to allow CSS styling
function appendMessage(msg, type) {
    if (!messages) {
        console.error("Messages container not found!");
        return;
    }
    const messageElement = document.createElement("div");
    // Add base class for potential common styling
    // messageElement.classList.add("message-bubble"); 

    // Add specific class based on sender type for styling (alignment, color)
    if (type === "you") {
        messageElement.classList.add("message-you"); 
        messageElement.textContent = "You: " + msg; // Keep original prefix if desired
    } else if (type === "stranger") {
        messageElement.classList.add("message-stranger");
        messageElement.textContent = "Stranger: " + msg; // Keep original prefix if desired
    } else { // System message
        messageElement.classList.add("system-message");
        messageElement.textContent = msg;
    }
    messages.appendChild(messageElement);
    messages.scrollTop = messages.scrollHeight; 
}

// Removed video functions (startVideoChat, createPeerConnection)

// Emoji Picker Logic (Keep as is, assuming elements exist in text_corrected.html)
const emojiBtn = document.getElementById("emojiBtn");
const emojiPicker = document.getElementById("emojiPicker");

if (emojiBtn && emojiPicker && messageInput) {
    emojiBtn.onclick = () => {
        emojiPicker.style.display = emojiPicker.style.display === "none" ? "block" : "none";
    };
    emojiPicker.addEventListener("emoji-click", (event) => {
        messageInput.value += event.detail.unicode;
        emojiPicker.style.display = "none";
    });
} else {
    console.error("Emoji button, picker, or message input not found!");
}

// Reminder about Audio Errors
// The 403 errors for audio files from cdn.pixabay.com suggest hotlinking protection.
// Download the MP3 files and host them within your project's 'public' folder.
// Update the <audio> tags in text.html to use local paths (e.g., src="/sounds/send.mp3").


