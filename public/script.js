// script.js – handles chat logic

const socket = io();

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const messagesContainer = document.getElementById("messages");

function addMessage(message, sender) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");

  if (sender === "you") {
    msgDiv.classList.add("message-you");
  } else {
    msgDiv.classList.add("message-stranger");
  }

  msgDiv.textContent = message;
  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (message !== "") {
    addMessage(message, "you");
    socket.emit("chat message", message);
    messageInput.value = "";
  }
});

socket.on("chat message", (msg) => {
  addMessage(msg, "stranger");
});

