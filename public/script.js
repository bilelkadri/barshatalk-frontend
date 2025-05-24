const socket = io("https://barshatalk-text-server.onrender.com");

// UI elements
const chatScreen = document.getElementById("chatScreen");
const sendBtn = document.getElementById("sendBtn");
const nextBtn = document.getElementById("nextBtn"); 
const messageInput = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const statusText = document.getElementById("statusText"); // Added status text element

// Sound elements (check if IDs match text.html)
const messageSound = document.getElementById("sendSound"); 
const disconnectSound = document.getElementById("disconnectSound"); 

console.log("Text chat script loaded (v2 with styling + Enter key).");

// --- Socket Event Handlers ---
socket.on("connect", () => {
  console.log("Connected to text chat server");
  if (statusText) statusText.textContent = "✅ Connected, waiting for partner...";
});

socket.on("connect_error", (error) => {
    console.error("Text chat Socket.IO connection error:", error);
    appendMessage("⚠️ Connection error to text chat server.", "system");
    if (statusText) statusText.textContent = "❌ Connection Error";
});

socket.on("matched", () => { 
  appendMessage("🎉 Partner found! Start chatting.", "system");
  if (statusText) statusText.textContent = "🟢 Chatting with a stranger";
});

socket.on("waiting", () => {
  appendMessage("⏳ Waiting for a text chat partner...", "system");
  if (statusText) statusText.textContent = "⏳ Waiting for a partner...";
});

socket.on("message", (msg) => {
  appendMessage(msg, "stranger"); // Pass "stranger" type
});

socket.on("partnerDisconnected", () => {
    appendMessage("❌ Partner disconnected. Waiting for a new one...", "system");
    if (statusText) statusText.textContent = "❌ Partner left. Waiting...";
});

// --- UI Event Handlers ---

function sendMessage() {
    const msg = messageInput.value;
    if (msg.trim()) {
        appendMessage(msg, "you"); // Pass "you" type
        socket.emit("message", msg); 
        messageInput.value = "";
        if (messageSound) {
            messageSound.play().catch(e => console.error("Error playing send sound:", e));
        } else {
            console.warn("Send sound element not found");
        }
    }
}

// Send button click
if (sendBtn) {
    sendBtn.onclick = sendMessage;
} else {
    console.error("Send button (sendBtn) not found!");
}

// Send on Enter key press in message input
if (messageInput) {
    messageInput.addEventListener('keydown', (event) => {
        // Send if Enter is pressed without Shift key
        if (event.key === 'Enter' && !event.shiftKey) { 
            event.preventDefault(); // Prevent adding a new line
            sendMessage(); // Call the send message function
        }
    });
} else {
    console.error("Message input (messageInput) not found!");
}

// Next button click
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
          '<div class="system-message">⏳ Waiting for a new text chat partner...</div>'; // Clear messages and show waiting
    };
} else {
    console.error("Next button (nextBtn) not found!");
}

// --- Message Display Function (Restores Bubble Styling) ---
function appendMessage(msg, type) {
    if (!messages) {
        console.error("Messages container not found!");
        return;
    }

    const messageElement = document.createElement('div');
    messageElement.classList.add('message-bubble'); // Base class for all bubbles

    if (type === 'you') {
        messageElement.classList.add('message-you'); // Class for your messages (e.g., align right, blue bg)
        messageElement.textContent = msg;
    } else if (type === 'stranger') {
        messageElement.classList.add('message-stranger'); // Class for stranger's messages (e.g., align left, gray bg)
        messageElement.textContent = msg;
    } else { // Default to system message
        messageElement.classList.add('system-message'); // Class for system messages (e.g., centered, italic)
        messageElement.textContent = msg;
    }

    messages.appendChild(messageElement);
    messages.scrollTop = messages.scrollHeight; // Scroll to bottom
}

// --- Emoji Picker Logic (Keep as is) ---
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

// --- Reminder about Audio Errors ---
// The 403 errors for audio files from cdn.pixabay.com suggest hotlinking protection.
// For reliable sound, download the MP3 files and host them within your project's 'public' folder.
// Then update the <audio> tags in text.html to use local paths, e.g.:
// <audio id="sendSound" src="/sounds/send.mp3"></audio>
// <audio id="disconnectSound" src="/sounds/disconnect.mp3"></audio>

