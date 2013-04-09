"use strict";
//Relinguish jQuery from the $ variable
jQuery.noConflict();
//make our own scope where jQuery can live in peace
(function($){
var hostname;
$(document).ready(function() {
	hostname = window.location.hostname;
	console.log("hostname: "+hostname);
	init_button1();
	init_button2();
	start_socket_io();
	$('#script').hover(
		function(){$('#script_long').css('display','block')},
		function(){$('#script_long').fadeOut()}
	);
});

function init_button1(){
	$("#button1").click(function() {
		$("#button1").fadeTo(200, 0.25);
		$.ajax(hostname,{
			type: 'GET',
			data: 'restart',
			success: button1_success,
			error: button_error
		});
	});
}

function init_button2(){
	$("#button2").click(function() {
		var newscript = prompt('New script - Complete path:');
		$("#button2").fadeTo(200, 0.25);
		$.ajax(hostname,{
			type: 'GET',
			data: 'newscript='+newscript,
			success: button2_success,
			error: button_error
		});
	});
}

function button1_success(data, textStatus, jqXhr){
		$('#output').html(data);
		$("#button1").fadeTo(200, 1);
}

function button2_success(data, textStatus, jqXhr){
		$('#output').html(data);
		$("#button2").fadeTo(200, 1);
}

function button_error(jqXHR, textStatus, errorThrown) {
	alert("Button function error!\n"+errorThrown);
}

function start_socket_io (){
	var server = io.connect(hostname);
	server.on('messages', function (data){
		$('#output').html($('#output').html()+'<br>'+data.output);
	})

	server.on('disconnect', function (data){
		$('#script_file').text('Not Connected');
		$('#script_long').text('--');
		$('#output').css('border-color', 'red');
	});

	server.on('secondary_script', function (data){
		$('#script_file').text(data['baseScript']);
		$('#script_long').text(data['scriptDir']);
	})

	server.on('connect', function(){
		$('#output').css('border-color', 'green');
	})
}

})(jQuery);
