<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
session_start();

function getRequestData() {
    $body = file_get_contents('php://input');
    if ($body) {
        $data = json_decode($body, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $data;
        }
    }
    return $_POST;
}

$data = getRequestData();
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (!$email || !$password) {
    echo json_encode(['success' => false, 'message' => 'Email and password are required.']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT id, username, password FROM users WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        exit;
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];

    echo json_encode([
        'success' => true,
        'username' => $user['username'],
        'user_id' => (int)$user['id']
    ]);
    exit;
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Unable to sign in. Please try again.']);
    exit;
}
