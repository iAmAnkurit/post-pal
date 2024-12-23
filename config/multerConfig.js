const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/images/uploads");
  },
  filename: (req, file, cb) => {
    crypto.randomBytes(12, (err, bytes) => {
      const fileName = bytes.toString("hex") + path.extname(file.originalname);

      cb(null, file.fieldname + "-" + fileName);
    });
  },
});

const upload = multer({ storage: storage });

module.exports = upload;
