<?php
declare(strict_types=1);
function setting(string $key, string $default = ''): string {
    static $local;
    if ($local === null) $local = is_file(__DIR__.'/config.local.php') ? require __DIR__.'/config.local.php' : [];
    $value = getenv($key);
    return $value !== false ? $value : (string)($local[$key] ?? $default);
}
function db(): PDO {
    static $pdo;
    if (!$pdo) {
        $options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false];
        if (setting('DB_SSL_CA')) {
            $options[PDO::MYSQL_ATTR_SSL_CA] = setting('DB_SSL_CA');
            $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
        }
        $pdo = new PDO('mysql:host='.setting('DB_HOST','127.0.0.1').';port='.setting('DB_PORT','3306').';dbname='.setting('DB_NAME','mm2100_map').';charset=utf8mb4', setting('DB_USER'), setting('DB_PASSWORD'), $options);
    }
    return $pdo;
}
function query(string $sql, array $args = []): PDOStatement {
    $stmt = db()->prepare($sql); $stmt->execute($args); return $stmt;
}
function reply(array $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR); exit;
}
function fail(string $message, int $status = 400): never { reply(['error'=>$message], $status); }
function valid_date(mixed $date): bool {
    if (!is_string($date)) return false;
    $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
    return $parsed && $parsed->format('Y-m-d') === $date && $date <= gmdate('Y-m-d');
}
function validate_facility(array $input): array {
    $out = [];
    foreach (['parent_id'=>80,'unit_number'=>80] as $key=>$max) {
        $v=$input[$key] ?? null;
        if ($v!==null && (!is_string($v)||strlen($v)>$max)) fail('Kolom '.$key.' tidak valid.',422);
        $out[$key]=$v===null||trim($v)===''?null:trim($v);
    }
    foreach (['id'=>80,'name'=>200,'category'=>40,'address'=>1000,'source'=>1000,'status'=>16] as $key=>$max) {
        if (!is_string($input[$key] ?? null) || strlen($input[$key]) > $max) fail('Kolom '.$key.' tidak valid.',422);
        $out[$key] = trim($input[$key]);
    }
    if (!preg_match('/^[a-zA-Z0-9_-]{1,80}$/D',$out['id']) || !$out['name']) fail('ID atau nama tidak valid.',422);
    if (!query('SELECT id FROM categories WHERE id=? AND enabled=1',[$out['category']])->fetchColumn()) fail('Kategori tidak tersedia atau nonaktif.',422);
    if (!in_array($out['status'], ['draft','published','archived'], true)) fail('Status tidak valid.',422);
    foreach (['latitude'=>90,'longitude'=>180] as $key=>$max) {
        $n = $input[$key] ?? null;
        if ((!is_float($n) && !is_int($n)) || !is_finite((float)$n) || abs($n)>$max) fail('Koordinat tidak valid.',422);
        $out[$key]=$n;
    }
    foreach (['tags','menu_keywords'] as $key) {
        $items=$input[$key] ?? null;
        if (!is_array($items) || !array_is_list($items) || count($items)>50) fail('Daftar '.$key.' tidak valid.',422);
        foreach ($items as $item) if (!is_string($item) || !trim($item) || strlen($item)>100) fail('Isi '.$key.' tidak valid.',422);
        $out[$key]=array_values(array_unique(array_map('trim',$items)));
    }
    foreach (['opening_hours','phone','website','verified_at'] as $key) {
        $value=$input[$key] ?? null;
        if ($value !== null && (!is_string($value) || strlen($value)>1000)) fail('Kolom '.$key.' tidak valid.',422);
        $out[$key]=$value === null || trim($value)==='' ? null : trim($value);
    }
    if ($out['website'] !== null && (!filter_var($out['website'],FILTER_VALIDATE_URL) || !in_array(strtolower(parse_url($out['website'],PHP_URL_SCHEME) ?? ''),['http','https'],true))) fail('Website harus URL HTTP/HTTPS.',422);
    if ($out['verified_at'] !== null && !valid_date($out['verified_at'])) fail('Tanggal verifikasi tidak valid.',422);
    if ($out['status']==='published' && (!$out['address'] || !$out['source'] || !valid_date($out['verified_at']) || ($input['demo'] ?? false))) fail('Alamat, sumber, dan tanggal verifikasi wajib sebelum publikasi; data demo tidak boleh diterbitkan.',422);
    return $out;
}
function validate_plot(array $input): array {
    $out=[];
    foreach (['id'=>80,'plot_number'=>100,'status'=>16,'zonation'=>100,'source'=>1000] as $key=>$max) {
        if (!is_string($input[$key]??null) || strlen($input[$key])>$max) fail('Kolom '.$key.' tidak valid.',422);
        $out[$key]=trim($input[$key]);
    }
    if (!preg_match('/^[a-zA-Z0-9_-]{1,80}$/D',$out['id']) || !$out['plot_number'] || !$out['zonation']) fail('ID, nomor bidang, atau zonasi tidak valid.',422);
    if (!in_array($out['status'],['draft','available','reserved','occupied','utility','archived'],true)) fail('Status bidang tidak valid.',422);
    $tenant=$input['tenant_name']??null;
    if ($tenant!==null && (!is_string($tenant)||strlen($tenant)>200)) fail('Nama tenant tidak valid.',422);
    $out['tenant_name']=$tenant===null||trim($tenant)===''?null:trim($tenant);
    $area=$input['area_m2']??null;
    if ((!is_int($area)&&!is_float($area)) || !is_finite((float)$area) || $area<=0 || $area>1000000000) fail('Luas bidang tidak valid.',422);
    $out['area_m2']=$area;
    $coordinates=$input['coordinates']??null;
    if (!is_array($coordinates)||!array_is_list($coordinates)||count($coordinates)<4||count($coordinates)>500) fail('Polygon memerlukan minimal tiga titik.',422);
    $clean=[];
    foreach($coordinates as $point) {
        if (!is_array($point)||count($point)!==2||(!is_int($point[0])&&!is_float($point[0]))||(!is_int($point[1])&&!is_float($point[1]))||!is_finite((float)$point[0])||!is_finite((float)$point[1])||abs($point[0])>180||abs($point[1])>90) fail('Koordinat polygon tidak valid.',422);
        $clean[]=[(float)$point[0],(float)$point[1]];
    }
    if ($clean[0]!==$clean[count($clean)-1]) fail('Polygon harus tertutup.',422);
    $out['coordinates']=$clean;
    $verified=$input['verified_at']??null;
    if ($verified!==null && (!is_string($verified)||!valid_date($verified))) fail('Tanggal verifikasi tidak valid.',422);
    $out['verified_at']=$verified===null||$verified===''?null:$verified;
    if (!in_array($out['status'],['draft','archived'],true) && (!$out['source']||!$out['verified_at'])) fail('Sumber dan tanggal verifikasi wajib sebelum bidang ditampilkan.',422);
    return $out;
}
function validate_infrastructure(array $input): array {
    $out=[];
    foreach(['id'=>80,'name'=>160,'category'=>40,'geometry_type'=>10,'status'=>16,'description'=>1000,'source'=>1000] as $key=>$max){
        if(!is_string($input[$key]??null)||strlen($input[$key])>$max)fail('Kolom '.$key.' tidak valid.',422);$out[$key]=trim($input[$key]);
    }
    if(!preg_match('/^[a-zA-Z0-9_-]{1,80}$/D',$out['id'])||!$out['name'])fail('ID atau nama infrastruktur tidak valid.',422);
    if(!query('SELECT id FROM infrastructure_categories WHERE id=? AND enabled=1',[$out['category']])->fetchColumn()||!in_array($out['geometry_type'],['point','line'],true)||!in_array($out['status'],['draft','published','archived'],true))fail('Jenis infrastruktur tidak valid atau nonaktif.',422);
    $coordinates=$input['coordinates']??null;$minimum=$out['geometry_type']==='point'?1:2;
    if(!is_array($coordinates)||!array_is_list($coordinates)||count($coordinates)<$minimum||count($coordinates)>1000)fail('Koordinat infrastruktur tidak valid.',422);
    $out['coordinates']=[];foreach($coordinates as $p){if(!is_array($p)||count($p)!==2||!is_numeric($p[0])||!is_numeric($p[1])||abs((float)$p[0])>180||abs((float)$p[1])>90)fail('Koordinat infrastruktur tidak valid.',422);$out['coordinates'][]=[(float)$p[0],(float)$p[1]];}
    if($out['geometry_type']==='point')$out['coordinates']=[$out['coordinates'][0]];
    $verified=$input['verified_at']??null;if($verified!==null&&(!is_string($verified)||!valid_date($verified)))fail('Tanggal verifikasi tidak valid.',422);$out['verified_at']=$verified?:null;
    if($out['status']==='published'&&(!$out['source']||!$out['verified_at']))fail('Sumber dan tanggal verifikasi wajib sebelum publikasi.',422);
    return $out;
}
function new_session(?int $admin): array {
    $token=bin2hex(random_bytes(32)); $csrf=bin2hex(random_bytes(32)); $expires=time()+28800;
    query('INSERT INTO app_sessions(token_hash,admin_id,csrf,expires_at) VALUES (?,?,?,?)',[hash('sha256',$token),$admin,$csrf,$expires]);
    setcookie('mm2100_session',$token,['expires'=>$expires,'path'=>'/','secure'=>str_starts_with(setting('APP_ORIGIN'),'https://'),'httponly'=>true,'samesite'=>'Strict']);
    return ['token_hash'=>hash('sha256',$token),'admin_id'=>$admin,'csrf'=>$csrf,'expires_at'=>$expires];
}
function current_session(): array {
    $token=$_COOKIE['mm2100_session'] ?? '';
    $session = preg_match('/^[a-f0-9]{64}$/D',$token) ? query('SELECT * FROM app_sessions WHERE token_hash=? AND expires_at>?',[hash('sha256',$token),time()])->fetch(PDO::FETCH_ASSOC) : false;
    return $session ?: new_session(null);
}
function local_setup(): bool {
    $origin=parse_url(setting('APP_ORIGIN'));
    return setting('ALLOW_LOCAL_SETUP')==='1'
        && in_array($_SERVER['REMOTE_ADDR'] ?? '',['127.0.0.1','::1'],true)
        && ($origin['scheme'] ?? '')==='http'
        && in_array($origin['host'] ?? '',['127.0.0.1','localhost'],true)
        && !isset($origin['user']) && !isset($origin['pass'])
        && !isset($origin['path']) && !isset($origin['query']) && !isset($origin['fragment']);
}

function resolve_parents(array $rows): array {
    $index=[];foreach($rows as $row)$index[$row['id']]=$row;
    foreach($rows as &$row)if(!empty($row['parent_id']) && isset($index[$row['parent_id']])) {
        $parent=$index[$row['parent_id']];
        foreach(['latitude','longitude','address'] as $key)$row[$key]=$parent[$key];
    }
    unset($row);return $rows;
}
