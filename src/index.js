const express=require('express');
const app=express();
const path=require('path');
const conexion=require('./databases/db');
const bcryptjs=require('bcryptjs');
const session=require('express-session');
const multer = require('multer');
const { redirect } = require('express/lib/response');
const uuid = require('uuid');

//Configurar
app.set('port',5555);
app.set('views',path.join(__dirname+"/views"))
app.engine('html',require('ejs').renderFile);
app.set('view engine','ejs');

const storage = multer.diskStorage({
    destination: path.join(__dirname,'public/img/trabajos'),
    filename: (req,file,cb) => {
        console.log("hecho");
        cb(null,uuid.v4() +  path.extname(file.originalname).toLowerCase());
    }
    
});
//Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}))

app.use(multer({
    storage,
    dest: path.join(__dirname,'public/img/trabajos'),
    fileFilter: (req, file, cb)=>{
        const fileType = /jpeg|jpg|png/;
        const mimetype = fileType.test(file.mimetype);
        const extencion = fileType.test(path.extname(file.originalname));
        if (mimetype && extencion){
            return cb(null, true);
        }
        cb("Error, imagen no válida")
    }
}).single('imagen'));

app.use(require('./rutas/routes'))

//Archivos
app.listen(app.get('port'),()=>{

})