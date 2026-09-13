<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
try {
    $action=$_GET['action'] ?? 'public';
    $method=$_SERVER['REQUEST_METHOD'];
    if ($action==='public' && $method==='GET') {
        $rows=query("SELECT payload FROM facilities WHERE status='published' ORDER BY id")->fetchAll(PDO::FETCH_COLUMN);
        $plotRows=query("SELECT payload FROM plots WHERE status NOT IN ('draft','archived') ORDER BY id")->fetchAll(PDO::FETCH_COLUMN);
        $infraRows=query("SELECT payload FROM infrastructure WHERE status='published' ORDER BY id")->fetchAll(PDO::FETCH_COLUMN);
        reply(['schema_version'=>1,'updated_at'=>gmdate('Y-m-d\TH:i:s\Z'),'categories'=>query('SELECT id,label,icon FROM categories WHERE enabled=1 ORDER BY id')->fetchAll(PDO::FETCH_ASSOC),'plots'=>array_map(fn($r)=>json_decode($r,true,512,JSON_THROW_ON_ERROR),$plotRows),'infrastructure'=>array_map(fn($r)=>json_decode($r,true,512,JSON_THROW_ON_ERROR),$infraRows),'facilities'=>resolve_parents(array_map(fn($r)=>json_decode($r,true,512,JSON_THROW_ON_ERROR),$rows))]);
    }
    $session=current_session();
    if ($method==='POST') {
        if (($_SERVER['HTTP_ORIGIN'] ?? '') !== setting('APP_ORIGIN')) fail('Asal permintaan tidak diizinkan.',403);
        if (!hash_equals($session['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) fail('Sesi berubah. Muat ulang halaman.',403);
        if (!str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) fail('Gunakan JSON.',415);
        $raw=file_get_contents('php://input',false,null,0,65537);
        if (strlen($raw)>65536) fail('Data terlalu besar.',413);
        try { $input=json_decode($raw,true,32,JSON_THROW_ON_ERROR); } catch (JsonException) { fail('JSON tidak valid.'); }
        if (!is_array($input) || array_is_list($input)) fail('Objek JSON diperlukan.');
    }
    if ($action==='session' && $method==='GET') {
        $email=$session['admin_id'] ? query('SELECT email FROM admins WHERE id=?',[$session['admin_id']])->fetchColumn() : null;
        reply(['email'=>$email ?: null,'csrf'=>$session['csrf'],'setup'=>local_setup() && (int)query('SELECT COUNT(*) FROM admins')->fetchColumn()===0]);
    }
    if (in_array($action,['login','setup'],true) && $method==='POST') {
        $email=strtolower(trim(is_string($input['email'] ?? null) ? $input['email'] : ''));
        $password=is_string($input['password'] ?? null) ? $input['password'] : '';
        if (!filter_var($email,FILTER_VALIDATE_EMAIL) || strlen($email)>254 || strlen($password)>72) fail('Email atau password tidak valid.',422);
        if ($action==='setup') {
            if (!local_setup()) fail('Pembuatan admin hanya melalui setup lokal atau CLI server.',403);
            if (strlen($password)<12) fail('Password minimal 12 karakter.',422);
            // A database advisory lock prevents two simultaneous first-admin requests.
            if (!(int)query("SELECT GET_LOCK('mm2100_admin_setup',5)")->fetchColumn()) fail('Coba kembali.',409);
            try {
                if ((int)query('SELECT COUNT(*) FROM admins')->fetchColumn()!==0) fail('Admin sudah dibuat. Silakan login.',409);
                query('INSERT INTO admins(email,password_hash) VALUES (?,?)',[$email,password_hash($password,PASSWORD_DEFAULT)]);
                $admin=(int)db()->lastInsertId();
            } finally { query("SELECT RELEASE_LOCK('mm2100_admin_setup')"); }
        } else {
            foreach (['email:'.$email,'ip:'.($_SERVER['REMOTE_ADDR'] ?? '')] as $key) {
                $bucket=hash('sha256',$key); $now=time();
                query('INSERT INTO login_limits(bucket,attempts,expires_at) VALUES (?,1,?) ON DUPLICATE KEY UPDATE attempts=IF(expires_at<?,1,attempts+1), expires_at=IF(expires_at<?,VALUES(expires_at),expires_at)',[$bucket,$now+900,$now,$now]);
                if ((int)query('SELECT attempts FROM login_limits WHERE bucket=?',[$bucket])->fetchColumn()>10) fail('Terlalu banyak percobaan. Tunggu 15 menit.',429);
            }
            $row=query('SELECT id,password_hash FROM admins WHERE email=?',[$email])->fetch(PDO::FETCH_ASSOC);
            $dummy='$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
            $valid=password_verify($password,$row['password_hash'] ?? $dummy);
            if (!$row || !$valid) fail('Email atau password salah.',401);
            $admin=(int)$row['id'];
            if (password_needs_rehash($row['password_hash'],PASSWORD_DEFAULT)) query('UPDATE admins SET password_hash=? WHERE id=?',[password_hash($password,PASSWORD_DEFAULT),$admin]);
        }
        query('DELETE FROM app_sessions WHERE token_hash=?',[$session['token_hash']]);
        $session=new_session($admin);
        reply(['email'=>$email,'csrf'=>$session['csrf']]);
    }
    if (!$session['admin_id']) fail('Silakan login sebagai admin.',401);
    if ($action==='categories' && $method==='GET') reply(['categories'=>query('SELECT * FROM categories ORDER BY label')->fetchAll(PDO::FETCH_ASSOC)]);
    if ($action==='category_save' && $method==='POST') {
        $id=$input['id']??null;$label=$input['label']??null;$icon=$input['icon']??null;$enabled=$input['enabled']??null;$revision=$input['revision']??null;
        if(!is_string($id)||!preg_match('/^[a-z][a-z0-9_]{0,39}$/D',$id)||!is_string($label)||!trim($label)||strlen($label)>80||!in_array($icon,['resto_cafe','cafe','hotel','food_court','atm','medical','public_facility'],true)||!is_bool($enabled)||!is_int($revision)||$revision<0)fail('Data kategori tidak valid.',422);
        db()->beginTransaction();query('SELECT id FROM categories ORDER BY id FOR UPDATE')->fetchAll();
        $rows=query('SELECT payload FROM facilities ORDER BY id FOR UPDATE')->fetchAll(PDO::FETCH_COLUMN);
        if(!$enabled)foreach($rows as $raw)if((json_decode($raw,true)['category']??null)===$id){db()->rollBack();fail('Kategori masih digunakan fasilitas. Pindahkan fasilitas ke kategori lain terlebih dahulu.',422);}
        try {
            if($revision===0)query('INSERT INTO categories(id,label,icon,enabled) VALUES (?,?,?,?)',[$id,trim($label),$icon,(int)$enabled]);
            else if(query('UPDATE categories SET label=?,icon=?,enabled=?,revision=revision+1 WHERE id=? AND revision=?',[trim($label),$icon,(int)$enabled,$id,$revision])->rowCount()!==1){db()->rollBack();fail('Kategori sudah berubah. Muat ulang terlebih dahulu.',409);}
        }catch(PDOException $e){if($e->getCode()==='23000'){db()->rollBack();fail('Nama atau ID kategori sudah digunakan.',409);}throw $e;}
        query('INSERT INTO audit_log(admin_id,action,facility_id) VALUES (?,?,?)',[$session['admin_id'],'category_save',$id]);db()->commit();reply(['saved'=>true]);
    }
    if ($action==='logout' && $method==='POST') {
        query('DELETE FROM app_sessions WHERE token_hash=?',[$session['token_hash']]);
        $session=new_session(null); reply(['csrf'=>$session['csrf']]);
    }
    if ($action==='list' && $method==='GET') {
        $rows=query('SELECT payload,revision FROM facilities ORDER BY updated_at DESC,id')->fetchAll(PDO::FETCH_ASSOC);
        reply(['facilities'=>array_map(fn($r)=>['facility'=>json_decode($r['payload'],true,512,JSON_THROW_ON_ERROR),'revision'=>(int)$r['revision']],$rows)]);
    }
    if ($action==='plot_list' && $method==='GET') {
        $rows=query('SELECT payload,revision FROM plots ORDER BY updated_at DESC,id')->fetchAll(PDO::FETCH_ASSOC);
        reply(['plots'=>array_map(fn($r)=>['plot'=>json_decode($r['payload'],true,512,JSON_THROW_ON_ERROR),'revision'=>(int)$r['revision']],$rows)]);
    }
    if ($action==='plot_delete' && $method==='POST') {
        $id=$input['id']??null;$revision=$input['revision']??null;
        if(!is_string($id)||!is_int($revision)||$revision<1)fail('Data penghapusan bidang tidak valid.',422);
        db()->beginTransaction();
        if(query('DELETE FROM plots WHERE id=? AND revision=?',[$id,$revision])->rowCount()!==1){db()->rollBack();fail('Bidang sudah berubah atau sudah dihapus. Muat ulang.',409);}
        query('INSERT INTO audit_log(admin_id,action,facility_id) VALUES (?,?,?)',[$session['admin_id'],'plot_delete',$id]);
        db()->commit();reply(['deleted'=>true]);
    }
    if ($action==='plot_save' && $method==='POST') {
        if (!is_array($input['plot']??null)) fail('Data bidang diperlukan.',422);
        $revision=$input['revision']??null;
        if (!is_int($revision)||$revision<0) fail('Revisi tidak valid.',422);
        $plot=validate_plot($input['plot']);
        db()->beginTransaction();
        if ($revision===0) {
            try { query('INSERT INTO plots(id,payload,status) VALUES (?,?,?)',[$plot['id'],json_encode($plot,JSON_THROW_ON_ERROR),$plot['status']]); }
            catch(PDOException $e) { if($e->getCode()==='23000'){db()->rollBack();fail('ID bidang sudah ada.',409);} throw $e; }
        } else {
            $update=query('UPDATE plots SET payload=?,status=?,revision=revision+1 WHERE id=? AND revision=?',[json_encode($plot,JSON_THROW_ON_ERROR),$plot['status'],$plot['id'],$revision]);
            if($update->rowCount()!==1){db()->rollBack();fail('Bidang sudah diubah pada sesi lain. Muat ulang.',409);}
        }
        query('INSERT INTO audit_log(admin_id,action,facility_id) VALUES (?,?,?)',[$session['admin_id'],$revision===0?'plot_create':'plot_update',$plot['id']]);
        db()->commit();reply(['plot'=>$plot,'revision'=>$revision+1]);
    }
    if ($action==='infra_list' && $method==='GET') {
        $rows=query('SELECT payload,revision FROM infrastructure ORDER BY updated_at DESC,id')->fetchAll(PDO::FETCH_ASSOC);
        reply(['infrastructure'=>array_map(fn($r)=>['item'=>json_decode($r['payload'],true,512,JSON_THROW_ON_ERROR),'revision'=>(int)$r['revision']],$rows)]);
    }
    if ($action==='infra_delete' && $method==='POST') {
        $id=$input['id']??null;$revision=$input['revision']??null;
        if(!is_string($id)||!is_int($revision)||$revision<1)fail('Data penghapusan infrastruktur tidak valid.',422);
        db()->beginTransaction();
        if(query('DELETE FROM infrastructure WHERE id=? AND revision=?',[$id,$revision])->rowCount()!==1){db()->rollBack();fail('Infrastruktur sudah berubah atau sudah dihapus. Muat ulang.',409);}
        query('INSERT INTO audit_log(admin_id,action,facility_id) VALUES (?,?,?)',[$session['admin_id'],'infra_delete',$id]);
        db()->commit();reply(['deleted'=>true]);
    }
    if ($action==='infra_categories' && $method==='GET') reply(['categories'=>query('SELECT * FROM infrastructure_categories ORDER BY label')->fetchAll(PDO::FETCH_ASSOC)]);
    if ($action==='infra_category_save' && $method==='POST') {
        $id=$input['id']??null;$label=$input['label']??null;$color=$input['color']??null;$enabled=$input['enabled']??null;$revision=$input['revision']??null;
        if(!is_string($id)||!preg_match('/^[a-z][a-z0-9_]{0,39}$/D',$id)||!is_string($label)||!trim($label)||strlen($label)>80||!is_string($color)||!preg_match('/^#[0-9a-fA-F]{6}$/D',$color)||!is_bool($enabled)||!is_int($revision)||$revision<0)fail('Jenis aset tidak valid.',422);
        if(!$enabled){$rows=query('SELECT payload FROM infrastructure')->fetchAll(PDO::FETCH_COLUMN);foreach($rows as $raw)if((json_decode($raw,true)['category']??null)===$id)fail('Jenis aset masih digunakan oleh data infrastruktur.',422);}
        try{if($revision===0)query('INSERT INTO infrastructure_categories(id,label,color,enabled) VALUES (?,?,?,?)',[$id,trim($label),strtolower($color),(int)$enabled]);else if(query('UPDATE infrastructure_categories SET label=?,color=?,enabled=?,revision=revision+1 WHERE id=? AND revision=?',[trim($label),strtolower($color),(int)$enabled,$id,$revision])->rowCount()!==1)fail('Jenis aset sudah berubah. Muat ulang.',409);}catch(PDOException $e){if($e->getCode()==='23000')fail('Nama atau ID jenis aset sudah digunakan.',409);throw $e;}
        query('INSERT INTO audit_log(admin_id,action,facility_id) VALUES (?,?,?)',[$session['admin_id'],'infra_type_save',$id]);reply(['saved'=>true]);
    }
    if ($action==='infra_save' && $method==='POST') {
        if(!is_array($input['item']??null))fail('Data infrastruktur diperlukan.',422);$revision=$input['revision']??null;if(!is_int($revision)||$revision<0)fail('Revisi tidak valid.',422);$item=validate_infrastructure($input['item']);db()->beginTransaction();
        if($revision===0){try{query('INSERT INTO infrastructure(id,payload,status) VALUES (?,?,?)',[$item['id'],json_encode($item,JSON_THROW_ON_ERROR),$item['status']]);}catch(PDOException $e){if($e->getCode()==='23000'){db()->rollBack();fail('ID infrastruktur sudah ada.',409);}throw $e;}}
        else if(query('UPDATE infrastructure SET payload=?,status=?,revision=revision+1 WHERE id=? AND revision=?',[json_encode($item,JSON_THROW_ON_ERROR),$item['status'],$item['id'],$revision])->rowCount()!==1){db()->rollBack();fail('Data sudah berubah. Muat ulang.',409);}
        query('INSERT INTO audit_log(admin_id,action,facility_id) VALUES (?,?,?)',[$session['admin_id'],$revision===0?'infra_create':'infra_update',$item['id']]);db()->commit();reply(['item'=>$item,'revision'=>$revision+1]);
    }
    if ($action==='infra_import' && $method==='POST') {
        $items=$input['items']??null;
        if(!is_array($items)||count($items)<1||count($items)>1000)fail('Import harus berisi 1 sampai 1.000 data.',422);
        $validated=[];
        foreach($items as $index=>$candidate){
            if(!is_array($candidate))fail('Baris '.($index+1).' tidak valid.',422);
            try{$validated[]=validate_infrastructure($candidate);}catch(Throwable $e){fail('Baris '.($index+1).': '.$e->getMessage(),422);}
        }
        db()->beginTransaction();
        foreach($validated as $item){
            try{query('INSERT INTO infrastructure(id,payload,status) VALUES (?,?,?)',[$item['id'],json_encode($item,JSON_THROW_ON_ERROR),$item['status']]);}
            catch(PDOException $e){if($e->getCode()==='23000'){db()->rollBack();fail('Ada ID infrastruktur yang sudah digunakan.',409);}throw $e;}
            query('INSERT INTO audit_log(admin_id,action,facility_id) VALUES (?,?,?)',[$session['admin_id'],'infra_import',$item['id']]);
        }
        db()->commit();reply(['imported'=>count($validated)]);
    }
    if ($action==='save' && $method==='POST') {
        if (!is_array($input['facility'] ?? null)) fail('Data fasilitas diperlukan.',422);
        $revision=$input['revision'] ?? null;
        if (!is_int($revision) || $revision<0) fail('Revisi tidak valid.',422);
        db()->beginTransaction();
        // Lock the small directory during relationship validation, including parent updates.
        query('SELECT id FROM categories ORDER BY id FOR UPDATE')->fetchAll();
        $all=array_map(fn($r)=>json_decode($r,true,512,JSON_THROW_ON_ERROR),query('SELECT payload FROM facilities ORDER BY id FOR UPDATE')->fetchAll(PDO::FETCH_COLUMN));
        $candidate=$input['facility']; $parentId=$candidate['parent_id'] ?? null;
        if ($parentId) {
            $parent=null; foreach($all as $r) if($r['id']===$parentId)$parent=$r;
            if (!$parent || $parent['category']!=='food_court' || !empty($parent['parent_id']) || $parentId===($candidate['id']??null) || ($candidate['category']??null)!=='resto_cafe') { db()->rollBack(); fail('Tenant harus berupa resto/kantin dengan induk Food Court yang valid.',422); }
            if (($candidate['status']??null)==='published' && $parent['status']!=='published') { db()->rollBack(); fail('Terbitkan food court induk terlebih dahulu.',422); }
            foreach(['latitude','longitude','address'] as $key)$candidate[$key]=$parent[$key];
        }
        $f=validate_facility($candidate);
        foreach($all as $child) if(($child['parent_id']??null)===$f['id']) {
            if ($f['category']!=='food_court' || ($child['status']==='published' && $f['status']!=='published')) { db()->rollBack(); fail('Food court masih memiliki tenant. Pertahankan kategori; arsipkan tenant terbit sebelum menonaktifkan induk.',422); }
        }
        if ($revision===0) {
            try { query('INSERT INTO facilities(id,payload,status) VALUES (?,?,?)',[$f['id'],json_encode($f,JSON_THROW_ON_ERROR),$f['status']]); }
            catch (PDOException $e) { if ($e->getCode()==='23000') { db()->rollBack(); fail('ID sudah ada. Muat ulang daftar.',409); } throw $e; }
        } else {
            $update=query('UPDATE facilities SET payload=?,status=?,revision=revision+1 WHERE id=? AND revision=?',[json_encode($f,JSON_THROW_ON_ERROR),$f['status'],$f['id'],$revision]);
            if ($update->rowCount()!==1) { db()->rollBack(); fail('Data sudah diubah pada sesi lain. Muat ulang daftar sebelum menyimpan.',409); }
        }
        query('INSERT INTO audit_log(admin_id,action,facility_id) VALUES (?,?,?)',[$session['admin_id'],$revision===0?'create':'update',$f['id']]);
        db()->commit(); reply(['facility'=>$f,'revision'=>$revision+1]);
    }
    if ($action==='delete' && $method==='POST') {
        $id=$input['id']??null;$revision=$input['revision']??null;
        if(!is_string($id)||!is_int($revision)||$revision<1)fail('Data penghapusan fasilitas tidak valid.',422);
        db()->beginTransaction();
        $rows=query('SELECT payload FROM facilities ORDER BY id FOR UPDATE')->fetchAll(PDO::FETCH_COLUMN);
        foreach($rows as $raw){$row=json_decode($raw,true,512,JSON_THROW_ON_ERROR);if(($row['parent_id']??null)===$id){db()->rollBack();fail('Fasilitas masih memiliki tenant. Hapus atau pindahkan tenant terlebih dahulu.',422);}}
        if(query('DELETE FROM facilities WHERE id=? AND revision=?',[$id,$revision])->rowCount()!==1){db()->rollBack();fail('Fasilitas sudah berubah atau sudah dihapus. Muat ulang.',409);}
        query('INSERT INTO audit_log(admin_id,action,facility_id) VALUES (?,?,?)',[$session['admin_id'],'delete',$id]);
        db()->commit();reply(['deleted'=>true]);
    }
    fail('Rute atau metode tidak tersedia.',404);
} catch (Throwable $e) {
    if (isset($session) && db()->inTransaction()) db()->rollBack();
    error_log('MM2100 API: '.$e->getMessage());
    reply(['error'=>'Layanan database belum tersedia. Hubungi pengelola.'],503);
}
