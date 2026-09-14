<?php
// Server operator only. Pass secrets via environment, never command-line arguments.
if (PHP_SAPI !== 'cli') exit(1);
require __DIR__.'/../backend/bootstrap.php';
$mode=$argv[1] ?? '';
$email=strtolower(trim(getenv('ADMIN_EMAIL') ?: ''));
$password=getenv('ADMIN_PASSWORD') ?: '';
if (!in_array($mode,['create','create-user','reset'],true) || !filter_var($email,FILTER_VALIDATE_EMAIL) || strlen($email)>254 || strlen($password)<12 || strlen($password)>72) {
    fwrite(STDERR,"Set ADMIN_EMAIL and ADMIN_PASSWORD (12–72 bytes), then run admin-account.php create|create-user|reset.\n"); exit(1);
}
try {
    db()->beginTransaction();
    if (in_array($mode,['create','create-user'],true)) query('INSERT INTO admins(email,password_hash,role) VALUES (?,?,?)',[$email,password_hash($password,PASSWORD_DEFAULT),$mode==='create'?'admin':'internal']);
    else {
        $id=query('SELECT id FROM admins WHERE email=? FOR UPDATE',[$email])->fetchColumn();
        if (!$id) throw new RuntimeException('Admin not found.');
        query('UPDATE admins SET password_hash=? WHERE id=?',[password_hash($password,PASSWORD_DEFAULT),$id]);
        query('DELETE FROM app_sessions WHERE admin_id=?',[$id]);
    }
    db()->commit(); echo "Account updated.\n";
} catch (Throwable $e) { if(db()->inTransaction())db()->rollBack();fwrite(STDERR,"Account operation failed. Verify email and database configuration.\n");exit(1); }
