const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());

app.use("/auth", require("./routes/auth"));
app.use("/wallet", require("./routes/wallet"));

app.get("/", (req, res) => {
  res.send("Trivexa Pay Running");
});

app.listen(3000, () => {
  console.log("Server running");
});
