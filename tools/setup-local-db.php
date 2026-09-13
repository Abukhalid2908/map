<?php
// Creates only the dedicated application database and least-privileged account.
if (PHP_SAPI !== 'cli') exit(1);
if (is_file(__DIR__.'/../backend/config.local.php')) { fwrite(STDERR,"Local config already exists; no changes made.\n"); exit(1); }
$root = new PDO('mysql:host=127.0.0.1;charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
if ($root->query("SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='mm2100_map'")->fetchColumn()) { fwrite(STDERR,"Database already exists; no changes made.\n");exit(1); }
if ($root->query("SELECT COUNT(*) FROM mysql.user WHERE User='mm2100_app'")->fetchColumn()) { fwrite(STDERR,"Account already exists; no changes made.\n");exit(1); }
$password=bin2hex(random_bytes(32));
$root->exec('CREATE DATABASE mm2100_map CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$root->exec("CREATE USER 'mm2100_app'@'127.0.0.1' IDENTIFIED BY ".$root->quote($password));
$root->exec("GRANT SELECT,INSERT,UPDATE,DELETE ON mm2100_map.* TO 'mm2100_app'@'127.0.0.1'");
$root->exec('USE mm2100_map');
$root->exec(file_get_contents(__DIR__.'/../backend/schema.sql'));
$config=['DB_HOST'=>'127.0.0.1','DB_PORT'=>'3306','DB_NAME'=>'mm2100_map','DB_USER'=>'mm2100_app','DB_PASSWORD'=>$password,'APP_ORIGIN'=>'http://127.0.0.1:8086','ALLOW_LOCAL_SETUP'=>'1'];
file_put_contents(__DIR__.'/../backend/config.local.php',"<?php\nreturn ".var_export($config,true).";\n");
echo "Database mm2100_map created. Dedicated application account configured. No administrator created; use /admin/ on local port 8086.\n";
