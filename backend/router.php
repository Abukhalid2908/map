<?php
// Local preview only: php -S 127.0.0.1:8086 backend/router.php
$path=rawurldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
if ($path==='/facilities.json') { $_GET['action']='public'; require __DIR__.'/api.php'; return; }
if ($path==='/api/index.php') { require __DIR__.'/api.php'; return; }
$admin=$path==='/admin' || str_starts_with($path,'/admin/');
$root=realpath(__DIR__.($admin?'/../admin-dist':'/../dist/client'));
$relative=$admin?substr($path,6):$path;
if ($relative==='' || $relative==='/') $relative='/index.html';
$file=$root ? realpath($root.'/'.$relative) : false;
if (!$root || !$file || !str_starts_with($file,$root.DIRECTORY_SEPARATOR) || !is_file($file)) { http_response_code(404); echo 'Not found'; return; }
$ext=pathinfo($file,PATHINFO_EXTENSION);
$types=['html'=>'text/html','js'=>'text/javascript','css'=>'text/css','json'=>'application/json','svg'=>'image/svg+xml','png'=>'image/png','woff2'=>'font/woff2','ico'=>'image/x-icon'];
if (!isset($types[$ext])) { http_response_code(404); return; }
header('Content-Type: '.$types[$ext]);
if ($ext==='html') header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff'); readfile($file);
