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

echo "=== CHECKING REFERRALS FOR ERLINDA OCAMPO ===\n";
$agent_first = 'Erlinda';
$agent_last = 'Ocampo';

$fn1 = '%' . strtolower($agent_first) . '%';
$fn2 = '%' . strtolower($agent_last) . '%';

$sql = "SELECT app.id, app.referred_by FROM applications app 
        WHERE LOWER(app.referred_by) LIKE :fn1 
           OR LOWER(app.referred_by) LIKE :fn2";

$stmt = $pdo->prepare($sql);
$stmt->execute([
    'fn1' => $fn1,
    'fn2' => $fn2
]);

while ($row = $stmt->fetch()) {
    echo "App ID: {$row['id']} | Referred By: '{$row['referred_by']}'\n";
}
