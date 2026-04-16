const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());

// ROUTES
app.use("/auth", require("./routes/auth"));

app.get("/", (req, res) => {
  res.send("Trivexa Pay API Running");
});

app.listen(3000, () => {
  console.log("Server running");
});
