const express=require('express');
const app=express();
const path=require('path');
const conexion=require('../databases/db');
const bcryptjs=require('bcryptjs');
const session=require('express-session');
const multer = require('multer');
const { redirect } = require('express/lib/response');
const uuid = require('uuid');
const {Router} = require('express');
const { rawListeners } = require('process');
const router = Router();
const stripe = require("stripe")('sk_test_51KSDOZCSDiTjPacS84qjgU7KS1PzbqZIH9seCfwY38isK3BL1EcOs7fYr1YB0JOjqVrK467EUOP6D5NdqPojW7sE00rynd7pKc');
const PDF = require('pdfkit-construct');


app.use(express.static("public"));

function formato(precioF){
    precio = ""+precioF;
    let precioFormato = "";
    var cont = 0;
    for(var j=precio.length-1; j >= 0; j--){
        cont++;
        precioFormato+=precio[j];
        if(cont%3==0 && j != 0){
            precioFormato+=',';
        }
    }
    let formatoFinal="";
    for(var j=precioFormato.length-1; j >= 0; j--){
        formatoFinal+=precioFormato[j];
    }
    return formatoFinal;
}

router.post("/create-payment-intent", async (req, res) => {
  const { items } = req.body;
  conexion.query("SELECT * FROM ventas WHERE id = ?",req.session.idVenta, async(error,results)=>{
        if(error){
            throw error;
        }else{
             // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: results[0].valor+'00',
                currency: "mxn",
                automatic_payment_methods: {
                enabled: true,
                },
            });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
        }
  })
});


//Ruta
router.get('/',(req,res)=>{
    req.session.destroy();
    conexion.query("SELECT * FROM trabajos ORDER BY id DESC",(error,results)=>{
        if(error){
            throw error;
        }else{
            res.render('index.html',{res: results})
        }
    })
})

router.get('/admin',(req,res)=>{
    res.render('admin.html');
})

router.get('/registrar',(req,res)=>{
    res.render('registrar.html');
})

router.post('/reg', async(req, res)=>{
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
router.get('/panel', (req,res)=>{
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
                res.render('admin.html',{
                    login: false
                });
            }
        }
    })
})
router.post('/auth', async(req, res)=>{
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

router.get('/logout',(req,res)=>{
    req.session.destroy(()=>{
        res.redirect('/');
    })
})

router.post('/anadir',(req,res)=>{
    const concepto= req.body.concepto;
    const valor = req.body.cantidad;
    const persona = req.body.persona;
    const descripcion = req.body.descripcion;
    conexion.query('INSERT INTO ventas SET ?',{concepto, valor, a_nombre_de: persona, descripcion}, (error, results)=>{
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
router.post('/verificar',async (req,res)=>{
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

router.post('/subir',(req,res)=>{
    const material = req.body.material;
    const precio = req.body.costo;
    const descripcion = req.body.descripcion;
    const archivo= req.file.filename;
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
                            alertTitle: "Trabajo subido con éxito.",
                            alertMessage: "La imagen ha sido añadida a la galería de trabajos.",
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

router.post('/buscar',(req,res)=>{
    const id = req.body.id;
    if(id){
        conexion.query("SELECT * FROM ventas WHERE pagada = '0' AND id = ?",[id], async (error, results)=>{
            if(results.length == 0){
                conexion.query("SELECT * FROM trabajos ORDER BY id DESC",(error,results)=>{
                    if(error){
                        throw error;
                    }else{
                        res.render('index.html',{
                            res: results,
                            alert: true,
                            alertTitle: "No hay ningún producto con esa código que no haya sido pagado aún.",
                            alertMessage: "Verifíquelo de nuevo o contacte a uno de nuestros vendedores.",
                            alertIcon: "error",
                            showConfirmButton: true,
                            time: false,
                            ruta: '/'
                        })
                    }
                })
            }else{
                conexion.query("SELECT * FROM trabajos ORDER BY id DESC",(error,results)=>{
                    if(error){
                        throw error;
                    }else{
                        req.session.idVenta = id;
                        res.render('index.html',{
                            res: results,
                            alert: true,
                            alertTitle: "Producto encontrado.",
                            alertMessage: "Redirigiendo al panel de venta.",
                            alertIcon: "success",
                            showConfirmButton: false,
                            time: 1500,
                            ruta: '/venta'
                        })
                    }
                })
            }
        })
    }
})

router.get('/venta', (req, res)=>{
    if(req.session.idVenta){
        conexion.query("SELECT * FROM ventas WHERE id = ?",[req.session.idVenta],(error, results)=>{
            if(error){
                throw error;
            }else{
                req.session.descripcion = results[0].descripcion
                req.session.precio = results[0].valor
                req.session.vendidoA = results[0].a_nombre_de
                req.session.concepto =  results[0].concepto
                res.render('producto.html',{
                    venta: true,
                    id: req.session.idVenta,
                    ventas: results
                });
            }
        })
    }else{
        res.redirect('/')
    }
})

router.get('/succes', async (req,res)=>{
    let consultas = [
        "UPDATE ventas SET pagada = '1' WHERE ?",
        "SELECT * FROM trabajos ORDER BY id DESC"
    ]
    conexion.query(consultas.join(';'),{ id : req.session.idVenta},(error, results)=>{
        if(error){
            throw error;
        }else{
            res.render('index.html',{
                id: req.session.idVenta,
                save: true,
                res: results[1],
                alert: true,
                alertTitle: "Factura.",
                alertMessage: "¿Desea guardar la factura?",
                alertIcon: "question",
                time: false,
                showConfirmButton: true,
                showDenyButton: true,
                ruta: ''
            });
        }
    })
})

router.get('/generate-pdf', async(req, res)=>{
    const doc = new PDF({
        bufferPage: true,
        size: 'letter',
        margins: {top: 20, left: 10, right: 10, bottom: 20},
        bufferPages: true,
    })
    
    const venta = [
        {
            nVenta : req.session.idVenta,
            descripcion: req.session.descripcion,
            precio: "$"+formato(req.session.precio)+"Mxn",
            vendidoA: req.session.vendidoA
        }
    ]
    const stream = res.writeHead(200, {
        'Content-Type':'application/pdf',
        'Content-disposition':'attachment;filename=factura.pdf'
    })
    doc.setDocumentHeader({
        height: '20',
        width: '100'
    }, () => {
        doc.fill("#000")
            .fontSize(20)
            .text("Factura de venta de "+req.session.concepto, doc.header.x, doc.header.y);
        doc.fontSize(14).text('                               ',{
            width: 420,
            align: 'center'
        });
        doc.fontSize(14).text('                               ',{
            width: 420,
            align: 'center'
        });
        doc.fontSize(14).text('                               ',{
            width: 420,
            align: 'center'
        });
        doc.fontSize(14).text('_____________________',{
            width: 420,
            align: 'center'
        });
        doc.text(req.session.vendidoA,{
            width: 420,
            align: 'center'
        });
        doc.fontSize(12).text('Firma de recibido',{
            width: 420,
            align: 'center'
        });
    });
    doc.addTable(
        [
            {key: 'nVenta', label: 'Número de la venta', align: 'left'},
            {key: 'descripcion', label: 'Descripción', align: 'left'},
            {key: 'precio', label: 'Precio', align: 'right'},
            {key: 'vendidoA', label: 'Vendido A: '},
        ],
        venta, {
            border: null,
            width: "fill_body",
            striped: true,
            stripedColors: ["#ffffff", "#fbfbfb"],
            cellsPadding: 10,
            marginLeft: 45,
            marginRight: 45,
            headAlign: 'center'
        });
        doc.render();
        // this should be the last
        // for this to work you need to set bufferPages to true in constructor options 
        doc.setPageNumbers((p, c) => `Página ${p} de ${c}`, "bottom right");

        doc.pipe(res);
        doc.end();

})

router.get('/ventas', (req, res)=>{
    let consultas = [
        "SELECT * FROM ventas WHERE pagada = '1'",
        "SELECT * FROM ventas WHERE pagada = '0'"
    ]
    conexion.query(consultas.join(';'),(error, results)=>{
        if(error){
            throw error;
        }else{
            if(req.session.loggedin){
                res.render('ventas.html',{
                    login: true,
                    admin: req.session.admin,
                    ventasNoPag: results[1],
                    ventasPag: results[0]
                });
            }else{
                res.render('admin.html',{
                    login: false
                });
            }
        }
    })
})

router.get('/galeria', (req, res)=>{
    req.session.destroy();
    conexion.query("SELECT * FROM trabajos ORDER BY id DESC",(error,results)=>{
        if(error){
            throw error;
        }else{
            res.render('galeria.html',{res: results})
        }
    })
})
module.exports = router;