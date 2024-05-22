const express = require("express");
const app = express();
const mongoose = require("mongoose");
const userModel = require("./models/user");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const path = require("path");

app.set("view engine", "ejs");
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/profile", isLoggedIn, async (req, res) => {
  try {
    const allUsers = await userModel.find();
    res.render("profile", {
      users: allUsers,
      loggedInUser: req.user,
      profileImg: req.user.profileImg,
    });
    console.log(req.user);
  } catch (error) {
    res.status(500).send("Error fetching users: " + error.message);
  }
});

app.post("/register", async (req, res) => {
  try {
    const { name, username, email, password, profileImage } = req.body;

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const createdUser = await userModel.create({
      name,
      username,
      email,
      password: hash,
      profileImage,
    });

    const token = jwt.sign(
      { email: email, username: username },
      process.env.JWT_SECRET || "hehehe"
    );
    res.cookie("token", token);
    res.send(createdUser);
  } catch (error) {
    res.status(500).send("Error during registration: " + error.message);
  }
});

app.post("/login", async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.body.email });
    if (!user) return res.send("Invalid email or password");

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (isMatch) {
      const token = jwt.sign(
        {
          email: req.body.email,
          username: user.username,
          name: user.name,
          profileImg: user.profileImage,
        },
        process.env.JWT_SECRET || "hehehe"
      );
      res.cookie("token", token);
      res.redirect("profile");
    } else {
      res.send("Invalid email or password");
    }
  } catch (error) {
    res.status(500).send("Error during login: " + error.message);
  }
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/");
});

function isLoggedIn(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.send("You must be logged in");
  }
  try {
    const data = jwt.verify(token, process.env.JWT_SECRET || "hehehe");
    req.user = data;
    next();
  } catch (error) {
    res.send("Invalid token");
  }
}

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
