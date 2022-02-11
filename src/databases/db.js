const mysql=require('mysql');


const conexion= mysql.createConnection({
    multipleStatements: true,
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'carpinteria'
});

conexion.connect((error)=>{
    if(error){
        console.log("Hubo un error al conectar la base de datos: "+error);
        return;
    }
    console.log("Conectado exitosamente")
})

module.exports = conexion;