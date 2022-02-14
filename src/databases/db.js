const mysql=require('mysql');


const conexion= mysql.createConnection({
    multipleStatements: true,
    host: 'mysql-69042-0.cloudclusters.net',
    port: '10755',
    user: 'admin',
    password: 'tk7IfMpE',
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