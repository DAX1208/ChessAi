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

try {
    $stmt = $pdo->prepare('SELECT session_id, role, message, created_at FROM chat_history WHERE user_id = :user_id ORDER BY created_at ASC');
    $stmt->execute(['user_id' => $_SESSION['user_id']]);
    $rows = $stmt->fetchAll();

    $metaStmt = $pdo->prepare('SELECT session_id, title, share_token FROM chat_sessions WHERE user_id = :user_id');
    $metaStmt->execute(['user_id' => $_SESSION['user_id']]);
    $metaRows = $metaStmt->fetchAll();

    $sessionMeta = [];
    foreach ($metaRows as $meta) {
        $sessionMeta[$meta['session_id']] = [
            'title' => $meta['title'] ?: 'New conversation',
            'share_token' => $meta['share_token'],
        ];
    }

    $sessions = [];
    foreach ($rows as $row) {
        $sessionId = $row['session_id'];
        if (!isset($sessions[$sessionId])) {
            $meta = $sessionMeta[$sessionId] ?? ensure_chat_session($pdo, (int) $_SESSION['user_id'], $sessionId);
            $sessions[$sessionId] = [
                'session_id' => $sessionId,
                'title' => $meta['title'] ?? 'New conversation',
                'share_token' => $meta['share_token'] ?? null,
                'created_at' => $row['created_at'],
                'messages' => []
            ];
        }

        $sessions[$sessionId]['messages'][] = [
            'role' => $row['role'],
            'message' => $row['message'],
            'created_at' => $row['created_at']
        ];
    }

    $profileStmt = $pdo->prepare('SELECT profile_picture FROM users WHERE id = :user_id LIMIT 1');
    $profileStmt->execute(['user_id' => $_SESSION['user_id']]);
    $profilePicture = $profileStmt->fetchColumn() ?: '';

    $grouped = array_values($sessions);
    usort($grouped, fn($a, $b) => strcmp($a['created_at'], $b['created_at']));

    echo json_encode([
        'success' => true,
        'username' => $_SESSION['username'] ?? '',
        'profile_picture' => $profilePicture,
        'user_id' => (int) $_SESSION['user_id'],
        'sessions' => $grouped
    ]);
    exit;
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to fetch chats.']);
    exit;
}
