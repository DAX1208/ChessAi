<?php
require_once __DIR__ . '/chat_session_helpers.php';
session_start();

header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

$body = file_get_contents('php://input');
$data = $body ? json_decode($body, true) : [];
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid payload.']);
    exit;
}

$sessionId = trim((string) ($data['session_id'] ?? ''));
$title = trim((string) ($data['title'] ?? ''));

if ($sessionId === '' || $title === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Session and title are required.']);
    exit;
}

if (mb_strlen($title) > 120) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Title must be 120 characters or less.']);
    exit;
}

try {
    ensure_chat_session($pdo, (int) $_SESSION['user_id'], $sessionId);
    $stmt = $pdo->prepare('UPDATE chat_sessions SET title = :title WHERE user_id = :user_id AND session_id = :session_id');
    $stmt->execute([
        'title' => $title,
        'user_id' => $_SESSION['user_id'],
        'session_id' => $sessionId,
    ]);

    echo json_encode(['success' => true, 'title' => $title]);
    exit;
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to rename conversation.']);
    exit;
}
