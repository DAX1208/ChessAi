<?php
require_once __DIR__ . '/db.php';
session_start();

header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

$userId = (int) $_SESSION['user_id'];
$baseDir = __DIR__ . '/../../uploads/profile_pics';
if (!is_dir($baseDir)) {
    mkdir($baseDir, 0777, true);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->prepare('SELECT username, profile_picture FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $userId]);
        $profile = $stmt->fetch();

        echo json_encode([
            'success' => true,
            'username' => $profile['username'] ?? '',
            'profile_picture' => $profile['profile_picture'] ?? '',
        ]);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to load profile.']);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$username = trim($_POST['username'] ?? '');
$hasFile = isset($_FILES['profile_picture']) && $_FILES['profile_picture']['error'] !== UPLOAD_ERR_NO_FILE;
$oldPicture = null;

try {
    $currentStmt = $pdo->prepare('SELECT username, profile_picture FROM users WHERE id = :id LIMIT 1');
    $currentStmt->execute(['id' => $userId]);
    $current = $currentStmt->fetch();
    $oldPicture = $current['profile_picture'] ?? null;

    if ($username !== '') {
        if (mb_strlen($username) < 2 || mb_strlen($username) > 50) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Username must be between 2 and 50 characters.']);
            exit;
        }

        $dupStmt = $pdo->prepare('SELECT id FROM users WHERE username = :username AND id != :id LIMIT 1');
        $dupStmt->execute(['username' => $username, 'id' => $userId]);
        if ($dupStmt->fetch()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'That username is already taken.']);
            exit;
        }
    }

    $profilePicturePath = $oldPicture;

    if ($hasFile) {
        $file = $_FILES['profile_picture'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Profile image upload failed.']);
            exit;
        }

        $allowed = ['image/jpeg', 'image/png', 'image/webp'];
        $mime = mime_content_type($file['tmp_name']);
        if (!in_array($mime, $allowed, true)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Only JPG, PNG, and WebP images are allowed.']);
            exit;
        }

        $ext = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => 'png'
        };

        $filename = bin2hex(random_bytes(12)) . '.' . $ext;
        $destination = $baseDir . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Unable to save profile image.']);
            exit;
        }

        $profilePicturePath = 'uploads/profile_pics/' . $filename;

        if ($oldPicture) {
            $oldPath = __DIR__ . '/../../' . ltrim($oldPicture, '/');
            if (is_file($oldPath)) {
                unlink($oldPath);
            }
        }
    }

    $update = $pdo->prepare('UPDATE users SET username = COALESCE(NULLIF(:username, ""), username), profile_picture = COALESCE(:profile_picture, profile_picture) WHERE id = :id');
    $update->execute([
        'username' => $username === '' ? null : $username,
        'profile_picture' => $profilePicturePath,
        'id' => $userId,
    ]);

    if ($username !== '') {
        $_SESSION['username'] = $username;
    }

    $updated = $pdo->prepare('SELECT username, profile_picture FROM users WHERE id = :id LIMIT 1');
    $updated->execute(['id' => $userId]);
    $profile = $updated->fetch();

    echo json_encode([
        'success' => true,
        'username' => $profile['username'] ?? '',
        'profile_picture' => $profile['profile_picture'] ?? '',
    ]);
    exit;
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to update profile.']);
    exit;
}
