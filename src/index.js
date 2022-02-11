const express=require('express');
const app=express();
const path=require('path');
const conexion=require('./databases/db');
const bcryptjs=require('bcryptjs');
const session=require('express-session');
const multer = require('multer');
const { redirect } = require('express/lib/response');

//Configurar
app.set('port',8000);
app.set('views',path.join(__dirname+"/views"))
app.engine('html',require('ejs').renderFile);
app.set('view engine','ejs');

const storage = multer.diskStorage({
    destination: path.join(__dirname,'public/img/trabajos'),
    filename: (req,file,cb) => {
        console.log("hecho");
        cb(null,file.originalname);
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
    dest: path.join(__dirname,'public/img/trabajos')
}).single('imagen'));


//Ruta
app.get('/',(req,res)=>{
    conexion.query("SELECT * FROM trabajos ORDER BY id DESC",(error,results)=>{
        if(error){
            throw error;
        }else{
            res.render('index.html',{res: results})
        }
    })
})

app.get('/admin',(req,res)=>{
    res.render('admin.html');
})

app.get('/registrar',(req,res)=>{
    res.render('registrar.html');
})

app.post('/reg', async(req, res)=>{
    const user= req.body.usuario;
    const pass= req.body.pass;
    let passPas = await bcryptjs.hash(pass,8)
    conexion.query('INSERT INTO administradores SET ?',{admin: user, pass: passPas}, async(error, results)=>{
        if(error){
            throw error;
        }else{
            res.render('registrar.html',{
                alert: true,
                alertTitle: "Registrado con éxito",
                alertMessage: "¡Ahora solo espera que otro administrador acepte tu registro!",
                alertIcon: "success",
                showConfirmButton: false,
                time: 1500,
                ruta: ''
            })
        }
    })
})
app.get('/panel', (req,res)=>{
    let consultas = [
        "SELECT * FROM administradores WHERE verificado = '0'",
        "SELECT * FROM ventas WHERE pagada = '0'"

    ]
    conexion.query(consultas.join(';'),(error, results)=>{
        if(error){
            throw error;
        }else{
            if(req.session.loggedin){
                res.render('panel.html',{
                    login: true,
                    admin: req.session.admin,
                    adminsNoVeri: results[0],
                    ventasNoPag: results[1]
                });
            }else{
                res.render('panel.html',{
                    login: false
                });
            }
        }
    })
})
app.post('/auth', async(req, res)=>{
    const user = req.body.usuario;
    const pass = req.body.pass;
    let passHash = await bcryptjs.hash(pass,8);
    if(user&&pass){
        conexion.query("SELECT * FROM administradores WHERE admin = ?",[user], async (error, results)=>{
            if(results.length == 0 || !(await bcryptjs.compare(pass, results[0].pass))){
                res.render('admin.html',{
                    alert: true,
                    alertTitle: "Administrador no encontrado.",
                    alertMessage: "Verifique que el usuario o la contraseña sean los correctos. De otra forma, contacte a un administrador.",
                    alertIcon: "error",
                    showConfirmButton: true,
                    time: false,
                    ruta: 'admin'
                })
            }else{
                if(results[0].verificado == 0){
                    res.render('admin.html',{
                        alert: true,
                        alertTitle: "Administrador no verificado.",
                        alertMessage: "Usted no es aún un administrador certificado. Comúniquese con otro administrador para verificarlo.",
                        alertIcon: "error",
                        showConfirmButton: true,
                        time: false,
                        ruta: 'admin'
                    })
                }else{
                    req.session.loggedin = true;
                    req.session.admin = results[0].admin;
                    res.render('admin.html',{
                        alert: true,
                        alertTitle: "Conexión exitosa.",
                        alertMessage: "Entrando al panel de administración.",
                        alertIcon: "success",
                        showConfirmButton: false,
                        time: 1500,
                        ruta: 'panel'
                    })
                }
            }
        })
    }else{
            res.render('admin.html',{
            alert: true,
            alertTitle: "Ingrese algún valor dentro de los campos.",
            alertMessage: "Verifique e intente de nuevo",
            alertIcon: "error",
            showConfirmButton: true,
            time: false,
            ruta: 'admin'
        })
    }
})

app.get('/logout',(req,res)=>{
    req.session.destroy(()=>{
        res.redirect('/');
    })
})

app.post('/anadir',(req,res)=>{
    const concepto= req.body.concepto;
    const valor = req.body.cantidad;
    conexion.query('INSERT INTO ventas SET ?',{concepto: concepto, valor: valor}, (error, results)=>{
        if(error){
            throw error;
        }else{
            let consultas = [
                "SELECT * FROM administradores WHERE verificado = '0'",
                "SELECT * FROM ventas WHERE pagada = '0'"
        
            ]
            conexion.query(consultas.join(';'),(error, results)=>{
                if(error){
                    throw error;
                }else{
                    if(req.session.loggedin){
                        res.render('panel.html',{
                            login: true,
                            admin: req.session.admin,
                            adminsNoVeri: results[0],
                            ventasNoPag: results[1],
                            alert: true,
                            alertTitle: "Venta añadida con éxito",
                            alertMessage: "La venta ha sido añadida a la base de datos con éxito.",
                            alertIcon: "success",
                            showConfirmButton: false,
                            time: 1500,
                            ruta: '/panel'
                        });
                    }else{
                        res.render('panel.html',{
                            login: false
                        });
                    }
                }
            })
        }
    })
})
app.post('/verificar',async (req,res)=>{
    const id = req.body.id;
    conexion.query("UPDATE administradores SET verificado = '1' WHERE ?",{id},async(error, results)=>{
        if(error){
            throw error;
        }else{
            let consultas = [
            "SELECT * FROM administradores WHERE verificado = '0'",
            "SELECT * FROM ventas WHERE pagada = '0'"
            ]
            conexion.query(consultas.join(';'),(error, results)=>{
                if(error){
                    throw error;
                }else{
                    if(req.session.loggedin){
                        res.render('panel.html',{
                            login: true,
                            admin: req.session.admin,
                            adminsNoVeri: results[0],
                            ventasNoPag: results[1],
                            alert: true,
                            alertTitle: "Administrador verificado con éxito.",
                            alertMessage: "Ahora el administrador puede hacer todas las acciones que necesite.",
                            alertIcon: "success",
                            showConfirmButton: false,
                            time: 1500,
                            ruta: '/panel'
                        });
                    }else{
                        res.render('panel.html',{
                            login: false
                        });
                    }
                }
            })
        }
    })
})

app.post('/subir',(req,res)=>{
    const material = req.body.material;
    const precio = req.body.costo;
    const descripcion = req.body.descripcion;
    const archivo = req.file.originalname;
    conexion.query('INSERT INTO trabajos SET ?',{material: material, precio: precio, descripcion: descripcion, archivo:archivo}, (error, results)=>{
        if(error){
            throw error;
        }else{
            let consultas = [
                "SELECT * FROM administradores WHERE verificado = '0'",
                "SELECT * FROM ventas WHERE pagada = '0'"
            ]
            conexion.query(consultas.join(';'),(error, results)=>{
                if(error){
                    throw error;
                }else{
                    if(req.session.loggedin){
                        res.render('panel.html',{
                            login: true,
                            admin: req.session.admin,
                            adminsNoVeri: results[0],
                            ventasNoPag: results[1],
                            alert: true,
                            alertTitle: "Venta añadida con éxito",
                            alertMessage: "La venta ha sido añadida a la base de datos con éxito.",
                            alertIcon: "success",
                            showConfirmButton: false,
                            time: 1500,
                            ruta: '/panel'
                        });
                    }else{
                        res.render('panel.html',{
                            login: false
                        });
                    }
                }
            })
        }
    })
})

//Archivos
app.listen(app.get('port'),()=>{

})