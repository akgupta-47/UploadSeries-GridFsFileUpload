const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride =  require('method-override');

dotenv.config({ path: './config.env' });
const app = express();

// Middlewares
app.use(bodyParser.json());
app.use(methodOverride('_method'));

const DB = process.env.MongoURI.replace(
    '<PASSWORD>',
    process.env.DataBase_Password
  );

/*
mongoose.connect(DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
}).then(() => console.log('DB connection successful still')).catch((err) => console.log('DB connection failed || ',err));*/

let gfs = {};
const connectDb = async () => {
   try {
       const connectionReturns = await  mongoose.connect(DB, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                useFindAndModify: false,
                useCreateIndex: true
            });

      gfs = Grid(connectionReturns.connections[0].db, mongoose.mongo);
      gfs.collection('uploads');
      console.log('db connection successfull');
   } catch (err){
       return console.log(err);
   }
}
connectDb();

const storage = new GridFsStorage({
    url: DB,
    file: async (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'
          };
          resolve(fileInfo);
        });
      });
    }
  });
const upload = multer({ storage });

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('index');
});

// @route POST /upload , upload files to db
// in upload.single(name-property in html used)
app.post('/upload',upload.single('file'), (req, res) => {
    // res.json({file: req.file});
    res.redirect('/');
});

app.get('/files', (req, res) => {
    // toArray function asks for a callback function
    // https://www.npmjs.com/package/gridfs-stream
    // refer above link for better understanding of workings
    gfs.files.find().toArray((err, files) => {
        // check if files
        // == compares variables only not datatypes and === also compares the datatype
        // like when 1 == '1'(true) is diffrent from 1 === '1'(false) becuase now it will also check the datatype
        if( !files || files.length === 0){
            return res.status(404).json({
                err: 'No files exist'
            });
        }

        // Files exist
        return res.json(files);
    })
});

app.get('/files/:filename', (req, res) => {
    // toArray function asks for a callback function
    gfs.files.findOne({filename: req.params.filename}, (err, file) => {
        if( !file || file.length === 0){
            return res.status(404).json({
                err: 'No files exist'
            });
        }
    });
});

const port = 5000 || process.env.PORT;

app.listen(port, () => console.log(`Server started running on port ${port}`));