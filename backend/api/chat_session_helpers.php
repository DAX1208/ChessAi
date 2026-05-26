<?php
require_once __DIR__ . '/db.php';

function derive_chat_title(string $message): string
{
    $clean = trim(preg_replace('/\s+/', ' ', $message));

    if ($clean === '') {
        return 'New conversation';
    }

    return mb_strlen($clean) > 36 ? mb_substr($clean, 0, 36) . '…' : $clean;
}

function ensure_chat_session(PDO $pdo, int $userId, string $sessionId): array
{
    $stmt = $pdo->prepare('SELECT id, title, share_token FROM chat_sessions WHERE user_id = :user_id AND session_id = :session_id LIMIT 1');
    $stmt->execute([
        'user_id' => $userId,
        'session_id' => $sessionId,
    ]);

    $existing = $stmt->fetch();
    if ($existing) {
        return [
            'id' => (int) $existing['id'],
            'title' => $existing['title'] ?: 'New conversation',
            'share_token' => $existing['share_token'],
        ];
    }

    $titleStmt = $pdo->prepare('SELECT message FROM chat_history WHERE user_id = :user_id AND session_id = :session_id AND role = "user" ORDER BY created_at ASC LIMIT 1');
    $titleStmt->execute([
        'user_id' => $userId,
        'session_id' => $sessionId,
    ]);
    $firstMessage = $titleStmt->fetchColumn();

    $insert = $pdo->prepare('INSERT INTO chat_sessions (user_id, session_id, title, share_token) VALUES (:user_id, :session_id, :title, NULL)');
    $insert->execute([
        'user_id' => $userId,
        'session_id' => $sessionId,
        'title' => derive_chat_title((string) $firstMessage),
    ]);

    return [
        'id' => (int) $pdo->lastInsertId(),
        'title' => derive_chat_title((string) $firstMessage),
        'share_token' => null,
    ];
}

function refresh_share_token(PDO $pdo, int $userId, string $sessionId): string
{
    $session = ensure_chat_session($pdo, $userId, $sessionId);

    if (!empty($session['share_token'])) {
        return $session['share_token'];
    }

    $token = bin2hex(random_bytes(16));
    $update = $pdo->prepare('UPDATE chat_sessions SET share_token = :share_token WHERE user_id = :user_id AND session_id = :session_id');
    $update->execute([
        'share_token' => $token,
        'user_id' => $userId,
        'session_id' => $sessionId,
    ]);

    return $token;
}

function delete_chat_session(PDO $pdo, int $userId, string $sessionId): void
{
    ensure_chat_session($pdo, $userId, $sessionId);

    $deleteHistory = $pdo->prepare('DELETE FROM chat_history WHERE user_id = :user_id AND session_id = :session_id');
    $deleteHistory->execute([
        'user_id' => $userId,
        'session_id' => $sessionId,
    ]);

    $deleteSession = $pdo->prepare('DELETE FROM chat_sessions WHERE user_id = :user_id AND session_id = :session_id');
    $deleteSession->execute([
        'user_id' => $userId,
        'session_id' => $sessionId,
    ]);
}
