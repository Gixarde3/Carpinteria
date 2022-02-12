$(document).ready(function(){
	$(window).scroll(function(){
		var barra = $(window).scrollTop();
		var posicion = barra * -0.02;
		$('.inicio').css({
			'background-position': '0 ' + posicion + 'rem'
		});
	});
});
function abrirVentana(funcion,nombre,id){
	$('#emergente').css({
		'transform':'scale(1)'
	});
	switch(funcion){
		case 1: 
		$('#ventana').html(
			"<h2>Añadir nueva venta</h2>"+
			"<form action='/anadir' method=POST>"+
			"	<input type='text' name='concepto' placeholder='Motivo de la venta' required>"+
			"	<input type='number' name='cantidad' placeholder='Costo total' required>"+
			"	<input type='text' name='persona' placeholder='A nombre de' required>"+
			"	<textarea name='descripcion' placeholder='Descripción del trabajo' cols='30' rows='5'></textarea>"+
			"	<input type='submit' name='enviar' value='Añadir venta' required>"+
			"</form>"
		)
		break;
		case 2: 
		$('#ventana').html(
			"<h2>Verificar administrador</h2>"+
			"<form action='/verificar' method=POST>"+
			"	<input type='hidden' name='id' value="+id+" required>"+
			"	<p>¿Está seguro que "+nombre+" es un administrador verificado?</p>"+
			"	<input type='submit' name='enviar' value='Verificar' required>"+
			"</form>"
		)
	}
}
function cerrarVent(){
	$('#emergente').css({
		'transform':'scale(0)'
	});
}