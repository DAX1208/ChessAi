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
if ($sessionId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Session is required.']);
    exit;
}

try {
    delete_chat_session($pdo, (int) $_SESSION['user_id'], $sessionId);
    echo json_encode(['success' => true, 'message' => 'Conversation deleted permanently.']);
    exit;
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to delete conversation.']);
    exit;
}
