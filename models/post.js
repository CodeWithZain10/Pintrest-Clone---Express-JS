const mongoose = require("mongoose");

const postSchema = mongoose.Schema({
  title: String,
  date: {
    type: Date,
    default: Date.now,
  },
  user: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  ],
});

module.exports = mongoose.model("post", postSchema);
