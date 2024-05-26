const express = require("express");
const mongoose = require("mongoose");
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();

app.set("view engine", "ejs");
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

mongoose.connect(`mongodb://127.0.0.1:27017/pintrestapp`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.get("/", async (req, res) => {
  try {
    const allPosts = await postModel.find().populate("user").exec();
    res.render("index", { posts: allPosts });
  } catch (error) {
    res.status(500).send("Error fetching posts: " + error.message);
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/createpost", isLoggedIn, (req, res) => {
  res.render("createpost");
});

app.get("/profile", isLoggedIn, async (req, res) => {
  try {
    const userPosts = await postModel
      .find({ user: req.user._id })
      .populate("user");
    res.render("profile", {
      loggedInUser: req.user,
      profileImg: req.user.profileImage,
      posts: userPosts,
    });
  } catch (error) {
    res.status(500).send("Error fetching profile data: " + error.message);
  }
});

app.post("/createpost", isLoggedIn, async (req, res) => {
  try {
    const { title, image } = req.body;
    const newPost = await postModel.create({
      title,
      image,
      user: req.user._id,
    });
    res.redirect("/profile");
  } catch (error) {
    res.status(500).send("Error creating post: " + error.message);
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
      {
        _id: createdUser._id,
        email: email,
        username: username,
        profileImg: profileImage,
      },
      process.env.JWT_SECRET || "hehehe"
    );
    res.cookie("token", token);
    res.redirect("/profile");
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
          _id: user._id,
          email: req.body.email,
          username: user.username,
          profileImg: user.profileImage,
        },
        process.env.JWT_SECRET || "hehehe"
      );
      res.cookie("token", token);
      res.redirect("/profile");
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
    userModel.findById(data._id).then((user) => {
      if (!user) return res.send("Invalid token");
      req.user = user;
      next();
    });
  } catch (error) {
    res.send("Invalid token");
  }
}

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
