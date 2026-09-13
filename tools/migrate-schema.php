<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__.'/../backend/bootstrap.php';
$sql=file_get_contents(__DIR__.'/../backend/schema.sql');
if ($sql===false) throw new RuntimeException('Schema tidak dapat dibaca.');
db()->exec($sql);
fwrite(STDOUT,"Schema database siap.\n");
