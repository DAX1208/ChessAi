<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

$token = trim((string) ($_GET['token'] ?? ''));
if ($token === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Share token is required.']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT cs.session_id, cs.title, u.username, ch.role, ch.message, ch.created_at
        FROM chat_sessions cs
        INNER JOIN users u ON u.id = cs.user_id
        INNER JOIN chat_history ch ON ch.user_id = cs.user_id AND ch.session_id = cs.session_id
        WHERE cs.share_token = :token
        ORDER BY ch.created_at ASC');
    $stmt->execute(['token' => $token]);
    $rows = $stmt->fetchAll();

    if (!$rows) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Shared conversation not found.']);
        exit;
    }

    $title = $rows[0]['title'] ?: 'Shared conversation';
    $messages = [];
    foreach ($rows as $row) {
        $messages[] = [
            'role' => $row['role'],
            'message' => $row['message'],
            'created_at' => $row['created_at'],
        ];
    }

    echo json_encode([
        'success' => true,
        'title' => $title,
        'username' => $rows[0]['username'],
        'messages' => $messages,
    ]);
    exit;
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to load shared conversation.']);
    exit;
}
