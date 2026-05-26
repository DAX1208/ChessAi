<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

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
$username = trim($data['username'] ?? '');
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (!$username || !$email || !$password) {
    echo json_encode(['success' => false, 'message' => 'All fields are required.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Please provide a valid email address.']);
    exit;
}

if (mb_strlen($password) < 6) {
    echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters long.']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT id FROM users WHERE username = :username OR email = :email LIMIT 1');
    $stmt->execute(['username' => $username, 'email' => $email]);
    $existing = $stmt->fetch();

    if ($existing) {
        $stmt = $pdo->prepare('SELECT id FROM users WHERE username = :username LIMIT 1');
        $stmt->execute(['username' => $username]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'That username is already taken.']);
            exit;
        }

        echo json_encode(['success' => false, 'message' => 'That email address is already registered.']);
        exit;
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $insert = $pdo->prepare('INSERT INTO users (username, email, password) VALUES (:username, :email, :password)');
    $insert->execute(['username' => $username, 'email' => $email, 'password' => $passwordHash]);

    echo json_encode(['success' => true, 'message' => 'Account created']);
    exit;
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Unable to create account. Please try again later.']);
    exit;
}
