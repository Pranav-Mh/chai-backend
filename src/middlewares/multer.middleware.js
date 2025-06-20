import multer from 'multer';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/temp"); // Folder to save the file
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Save with original file name
  }
});

export const upload = multer({
  storage: storage
});
