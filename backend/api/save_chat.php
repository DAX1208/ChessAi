<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/chat_session_helpers.php';
session_start();

header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

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
$sessionId = trim($data['session_id'] ?? '');
$role = trim($data['role'] ?? '');
$message = trim($data['message'] ?? '');

if (!$sessionId || !$role || !$message) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Session, role, and message are required.']);
    exit;
}

if (!in_array($role, ['user', 'bot'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid role provided.']);
    exit;
}

try {
    $stmt = $pdo->prepare('INSERT INTO chat_history (user_id, session_id, role, message) VALUES (:user_id, :session_id, :role, :message)');
    $stmt->execute([
        'user_id' => $_SESSION['user_id'],
        'session_id' => $sessionId,
        'role' => $role,
        'message' => $message
    ]);

    ensure_chat_session($pdo, (int) $_SESSION['user_id'], $sessionId);

    echo json_encode(['success' => true, 'message' => 'Chat saved']);
    exit;
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to save chat.']);
    exit;
}
