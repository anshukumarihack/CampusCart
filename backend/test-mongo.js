const mongoose = require('mongoose');
console.log("Starting test...");
mongoose.connect('mongodb://127.0.0.1:27017/campuscart')
  .then(() => {
    console.log("Connected successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Connection failed:", err.message);
    process.exit(1);
  });
