<?php

$host = '15.235.167.58';
$db   = 'atsscbms_sync_db1';
$user = 'atsscbms_sync_db1';
$pass = 'Sync2026!';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset;port=3306";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
     throw new \PDOException($e->getMessage(), (int)$e->getCode());
}

echo "=== CHECKING REFERRER ACCOUNT ID ===\n";
// Let's count how many applications have referrer_account_id set
$stmt = $pdo->query("SELECT COUNT(*) as count FROM applications WHERE referrer_account_id IS NOT NULL");
echo "Applications with referrer_account_id: " . $stmt->fetch()['count'] . "\n";

// Let's see if referrer_account_id matches any agent user id
$stmt = $pdo->query("SELECT app.id as app_id, app.referrer_account_id, app.referred_by, u.id as user_id, u.username, u.first_name, u.last_name 
                      FROM applications app 
                      JOIN users u ON app.referrer_account_id = u.id 
                      LIMIT 10");
while ($row = $stmt->fetch()) {
    echo "App ID: {$row['app_id']} | Referrer ID: {$row['referrer_account_id']} | Referred By (text): '{$row['referred_by']}' | Matches User: {$row['first_name']} {$row['last_name']} (User: {$row['username']})\n";
}

echo "\n=== JOB ORDERS WITH REFERRER ACCOUNT ID MATCHES ===\n";
$stmt = $pdo->query("SELECT jo.id as jo_id, app.id as app_id, app.referrer_account_id, app.referred_by, u.id as user_id, u.first_name, u.last_name 
                      FROM job_orders jo 
                      JOIN applications app ON jo.application_id = app.id 
                      JOIN users u ON app.referrer_account_id = u.id 
                      LIMIT 10");
while ($row = $stmt->fetch()) {
    echo "JO ID: {$row['jo_id']} | App ID: {$row['app_id']} | Referrer ID: {$row['referrer_account_id']} | Referred By (text): '{$row['referred_by']}' | Matches User: {$row['first_name']} {$row['last_name']}\n";
}
