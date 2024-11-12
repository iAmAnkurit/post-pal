const express = require("express");

const app = express();

const userModel = require("./models/user");
const postModel = require("./models/post");

const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const user = require("./models/user");
const multerConfig = require("./config/multerConfig");
const path = require("path");

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

const isLoggedIn = (req, res, next) => {
  if (req.cookies && Object.keys(req.cookies).length > 0) {
    let data = jwt.verify(req.cookies.token, "SecrectKey");
    req.user = data;
    next();
  } else {
    res.redirect("/login");
  }
};

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/profile/upload", (req, res) => {
  res.render("profileUpload");
});

app.post(
  "/upload",
  isLoggedIn,
  multerConfig.single("image"),
  async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    console.log(user);
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect("/profile");
  }
);

app.post("/register", async (req, res) => {
  let { name, username, email, age, password } = req.body;

  let user = await userModel.findOne({ email });

  if (user) {
    return res.status(500).send("User already registered");
  }

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      let user = userModel.create({
        name,
        username,
        email,
        age,
        password: hash,
      });

      let token = jwt.sign({ email: email, userId: user._id }, "SecrectKey");
      res.cookie("token", token);
      res.send("User is register");
    });
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/profile", isLoggedIn, async (req, res) => {
  const post = await postModel.find();

  const user = await userModel
    .findOne({ email: req.user.email })
    .populate("posts");
  res.render("profile", { user, post });
});

app.get("/like/:id", isLoggedIn, async (req, res) => {
  const post = await postModel.findOne({ _id: req.params.id }).populate("user");

  if (post.likes.indexOf(req.user.userId) === -1) {
    post.likes.push(req.user.userId);
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userId), 1);
  }
  await post.save();

  res.redirect("/profile");
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;

  let user = await userModel.findOne({ email });

  if (!user) {
    return res.status(500).send("User does not exist");
  }

  bcrypt.compare(password, user.password, (err, result) => {
    if (result) {
      let token = jwt.sign({ email: email, userId: user._id }, "SecrectKey");
      res.cookie("token", token);
      res.status(200).redirect("/profile");
    } else {
      res.status(422).send("Email or password is incorrect.");
    }
  });
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

app.post("/post", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });

  let post = await postModel.create({
    user: user._id,
    content: req.body.post,
  });

  user.posts.push(post._id);
  await user.save();

  res.redirect("/profile");
});

app.get("/edit/:id", isLoggedIn, async (req, res) => {
  const postId = req.params.id;

  const user = await userModel.findOne({ email: req.user.email });
  const post = await postModel.findOne({
    _id: postId,
  });

  if (user.posts.includes(postId)) {
    res.render("edit", { user, post });
  } else {
    console.log("You cannot edit");
  }
});

app.post("/update/:id", async (req, res) => {
  const post = await postModel.findOne({ _id: req.params.id });

  post.content = req.body.post;
  await post.save();
  res.redirect("/profile");
});

app.listen(3000);
