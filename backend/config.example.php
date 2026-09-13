<?php
// Copy to config.local.php for local development only. Azure uses environment variables.
return [
    'DB_HOST' => '127.0.0.1', 'DB_PORT' => '3306', 'DB_NAME' => 'mm2100_map',
    'DB_USER' => 'mm2100_app', 'DB_PASSWORD' => '',
    'APP_ORIGIN' => 'http://127.0.0.1:8086',
    'ALLOW_LOCAL_SETUP' => '1',
    // Azure: DB_SSL_CA must point to a trusted CA bundle, APP_ORIGIN must be HTTPS.
];
